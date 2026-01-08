import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CLERK_SECRET_KEY = Deno.env.get('CLERK_SECRET_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify Clerk secret key is configured
    if (!CLERK_SECRET_KEY) {
      throw new Error('CLERK_SECRET_KEY not configured')
    }

    const { email, redirectUrl, publicMetadata } = await req.json()

    if (!email) {
      throw new Error('Email is required')
    }

    // Call Clerk's Invitations API
    const clerkResponse = await fetch('https://api.clerk.com/v1/invitations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        redirect_url: redirectUrl || undefined,
        public_metadata: publicMetadata || {},
        // Set to false so invitation doesn't expire
        ignore_existing: false,
      }),
    })

    const clerkData = await clerkResponse.json()

    if (!clerkResponse.ok) {
      // Handle Clerk-specific errors
      const errorMessage = clerkData.errors?.[0]?.message || clerkData.message || 'Failed to send invitation'
      throw new Error(errorMessage)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`,
        invitation: clerkData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
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
