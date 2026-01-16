import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@populationmatters.org'
const APP_NAME = Deno.env.get('APP_NAME') || 'Productivity Tool'
const APP_URL = Deno.env.get('APP_URL') || 'https://ddpopmatters.github.io/PM-Productivity-Tool'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Restrict CORS to only the app's domain (security fix)
const ALLOWED_ORIGINS = [
  'https://ddpopmatters.github.io',
  APP_URL
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if origin is allowed
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.startsWith(allowed)
  ) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  }
}

// Request size limit (prevent memory exhaustion)
const MAX_REQUEST_SIZE = 50 * 1024 // 50KB for emails with content

// HTML escaping function to prevent XSS/injection attacks
function escapeHtml(text: string | undefined | null): string {
  if (!text) return ''
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

// Email format validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate notification type
const VALID_NOTIFICATION_TYPES = [
  'mention', 'assignment', 'collaborator_added', 'status_change', 'comment', 'subtask_assigned', 'due_reminder'
] as const

type NotificationType = typeof VALID_NOTIFICATION_TYPES[number]

interface NotificationRequest {
  recipientEmail: string
  recipientName?: string
  notificationType: NotificationType
  itemTitle: string
  itemId: string
  actorName: string
  details?: Record<string, string>
}

function generateEmailContent(notification: NotificationRequest): { subject: string, html: string } {
  const { notificationType, itemTitle, actorName, details, itemId } = notification
  const itemUrl = `${APP_URL}?item=${encodeURIComponent(itemId)}`

  // Escape all user-supplied content
  const safeItemTitle = escapeHtml(itemTitle)
  const safeActorName = escapeHtml(actorName)
  const safeComment = escapeHtml(details?.comment)
  const safeSubtaskTitle = escapeHtml(details?.subtask_title)
  const safeDeadline = escapeHtml(details?.deadline)
  const safeFromStatus = escapeHtml(details?.from_status) || 'Unknown'
  const safeToStatus = escapeHtml(details?.to_status) || 'Unknown'
  const safeDueDate = escapeHtml(details?.due_date) || 'soon'

  let subject = ''
  let bodyText = ''

  switch (notificationType) {
    case 'mention':
      subject = `${safeActorName} mentioned you in "${safeItemTitle}"`
      bodyText = `<p><strong>${safeActorName}</strong> mentioned you in a comment on <strong>${safeItemTitle}</strong>.</p>`
      if (safeComment) {
        bodyText += `<blockquote style="border-left: 3px solid #0077b6; padding-left: 12px; color: #555;">${safeComment}</blockquote>`
      }
      break

    case 'assignment':
      subject = `You've been assigned to "${safeItemTitle}"`
      bodyText = `<p><strong>${safeActorName}</strong> assigned you as the owner of <strong>${safeItemTitle}</strong>.</p>`
      break

    case 'collaborator_added':
      subject = `You've been added as a collaborator on "${safeItemTitle}"`
      bodyText = `<p><strong>${safeActorName}</strong> added you as a collaborator on <strong>${safeItemTitle}</strong>.</p>`
      break

    case 'status_change':
      subject = `Status updated on "${safeItemTitle}"`
      bodyText = `<p><strong>${safeActorName}</strong> changed the status of <strong>${safeItemTitle}</strong> from <em>${safeFromStatus}</em> to <em>${safeToStatus}</em>.</p>`
      break

    case 'comment':
      subject = `New comment on "${safeItemTitle}"`
      bodyText = `<p><strong>${safeActorName}</strong> added a comment on <strong>${safeItemTitle}</strong>.</p>`
      if (safeComment) {
        bodyText += `<blockquote style="border-left: 3px solid #0077b6; padding-left: 12px; color: #555;">${safeComment}</blockquote>`
      }
      break

    case 'subtask_assigned':
      subject = `New subtask assigned to you on "${safeItemTitle}"`
      bodyText = `<p><strong>${safeActorName}</strong> assigned you a subtask on <strong>${safeItemTitle}</strong>.</p>`
      if (safeSubtaskTitle) {
        bodyText += `<p>Subtask: <strong>${safeSubtaskTitle}</strong></p>`
      }
      if (safeDeadline) {
        bodyText += `<p>Deadline: ${safeDeadline}</p>`
      }
      break

    case 'due_reminder':
      subject = `Reminder: "${safeItemTitle}" is due soon`
      bodyText = `<p>This is a reminder that <strong>${safeItemTitle}</strong> is due ${safeDueDate}.</p>`
      break

    default:
      subject = `Update on "${safeItemTitle}"`
      bodyText = `<p>There's been an update on <strong>${safeItemTitle}</strong>.</p>`
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
        <h1 style="color: white; margin: 0; font-size: 20px;">${escapeHtml(APP_NAME)}</h1>
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
          <a href="${APP_URL}" style="color: #0077b6;">Visit ${escapeHtml(APP_NAME)}</a>
        </p>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    // Security: Check content length to prevent memory exhaustion
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new Response(
        JSON.stringify({ success: false, error: 'Request too large' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 413 }
      )
    }

    // ============================================
    // AUTHENTICATION CHECK (security fix)
    // ============================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the JWT token using Supabase Admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth verification failed:', authError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Log authenticated user for audit trail
    console.log(`Email request from authenticated user: ${user.email}`)

    // ============================================
    // CHECK RESEND CONFIGURATION
    // ============================================
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
          status: 200 // Return 200 to not break app flow
        }
      )
    }

    // ============================================
    // VALIDATE REQUEST BODY
    // ============================================
    const notification: NotificationRequest = await req.json()

    // Validate recipient email
    if (!notification.recipientEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Recipient email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!isValidEmail(notification.recipientEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid recipient email format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate notification type
    if (!VALID_NOTIFICATION_TYPES.includes(notification.notificationType as NotificationType)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid notification type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate required fields
    if (!notification.itemTitle || !notification.itemId || !notification.actorName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: itemTitle, itemId, actorName' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // ============================================
    // GENERATE AND SEND EMAIL
    // ============================================
    const { subject, html } = generateEmailContent(notification)

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
      console.error('Resend API error:', resendData)
      throw new Error(resendData.message || 'Failed to send email')
    }

    console.log(`Email sent successfully to ${notification.recipientEmail} by ${user.email}`)

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
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
