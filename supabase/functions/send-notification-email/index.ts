import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Use Resend for email sending - set RESEND_API_KEY in Supabase secrets
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'notifications@yourdomain.com'
const APP_NAME = Deno.env.get('APP_NAME') || 'PM Productivity Tool'
const APP_URL = Deno.env.get('APP_URL') || 'https://your-app-url.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  recipientEmail: string
  recipientName?: string
  notificationType: 'mention' | 'assignment' | 'status_change' | 'comment' | 'subtask_assigned' | 'due_reminder'
  itemTitle: string
  itemId: string
  actorName: string
  details?: Record<string, string>
}

function generateEmailContent(notification: NotificationRequest): { subject: string, html: string } {
  const { notificationType, itemTitle, actorName, details, itemId } = notification
  const itemUrl = `${APP_URL}?item=${itemId}`

  let subject = ''
  let bodyText = ''

  switch (notificationType) {
    case 'mention':
      subject = `${actorName} mentioned you in "${itemTitle}"`
      bodyText = `<p><strong>${actorName}</strong> mentioned you in a comment on <strong>${itemTitle}</strong>.</p>`
      if (details?.comment) {
        bodyText += `<blockquote style="border-left: 3px solid #0077b6; padding-left: 12px; color: #555;">${details.comment}</blockquote>`
      }
      break

    case 'assignment':
      subject = `You've been assigned to "${itemTitle}"`
      bodyText = `<p><strong>${actorName}</strong> assigned you to work on <strong>${itemTitle}</strong>.</p>`
      break

    case 'status_change':
      subject = `Status updated on "${itemTitle}"`
      bodyText = `<p><strong>${actorName}</strong> changed the status of <strong>${itemTitle}</strong> from <em>${details?.from_status || 'Unknown'}</em> to <em>${details?.to_status || 'Unknown'}</em>.</p>`
      break

    case 'comment':
      subject = `New comment on "${itemTitle}"`
      bodyText = `<p><strong>${actorName}</strong> added a comment on <strong>${itemTitle}</strong>.</p>`
      if (details?.comment) {
        bodyText += `<blockquote style="border-left: 3px solid #0077b6; padding-left: 12px; color: #555;">${details.comment}</blockquote>`
      }
      break

    case 'subtask_assigned':
      subject = `New subtask assigned to you on "${itemTitle}"`
      bodyText = `<p><strong>${actorName}</strong> assigned you a subtask on <strong>${itemTitle}</strong>.</p>`
      if (details?.subtask_title) {
        bodyText += `<p>Subtask: <strong>${details.subtask_title}</strong></p>`
      }
      if (details?.deadline) {
        bodyText += `<p>Deadline: ${details.deadline}</p>`
      }
      break

    case 'due_reminder':
      subject = `Reminder: "${itemTitle}" is due soon`
      bodyText = `<p>This is a reminder that <strong>${itemTitle}</strong> is due ${details?.due_date || 'soon'}.</p>`
      break

    default:
      subject = `Update on "${itemTitle}"`
      bodyText = `<p>There's been an update on <strong>${itemTitle}</strong>.</p>`
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">${APP_NAME}</h1>
      </div>

      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        ${bodyText}

        <div style="margin-top: 24px;">
          <a href="${itemUrl}" style="display: inline-block; background: #0077b6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            View Item
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 12px; color: #6b7280;">
          You received this email because you're involved in this item.
          <a href="${APP_URL}" style="color: #0077b6;">Visit ${APP_NAME}</a>
        </p>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if Resend is configured
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured - email not sent')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email service not configured',
          skipped: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Return 200 even if not configured to not break the flow
        }
      )
    }

    const notification: NotificationRequest = await req.json()

    if (!notification.recipientEmail) {
      throw new Error('Recipient email is required')
    }

    const { subject, html } = generateEmailContent(notification)

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [notification.recipientEmail],
        subject: subject,
        html: html,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(resendData.message || 'Failed to send email')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent to ${notification.recipientEmail}`,
        emailId: resendData.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Email notification error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
