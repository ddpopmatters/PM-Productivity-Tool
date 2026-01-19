import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Security: Restrict CORS to only allowed origins
const APP_URL = Deno.env.get('APP_URL') || 'https://ddpopmatters.github.io/PM-Productivity-Tool'
const ALLOWED_ORIGINS = [
  'https://ddpopmatters.github.io',
  APP_URL
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Use exact origin matching for security (no prefix matching)
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  }
}

// Request size limit (prevent memory exhaustion)
const MAX_REQUEST_SIZE = 10 * 1024 // 10KB

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Security: Check content length to prevent memory exhaustion
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Request too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create admin client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      // Don't log specifics about missing config in production
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the calling user's token and check if they're admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      // Don't expose internal error details to client
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if caller is an admin
    const { data: callerProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('email', user.email?.toLowerCase())
      .single()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can send invites' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { email, name, team, role, resend } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (existingUser) {
      // If resending, delete the old user and create a new invite
      if (resend) {
        // Check if user has actually signed in (has last_sign_in_at)
        if (existingUser.last_sign_in_at) {
          return new Response(
            JSON.stringify({ error: 'User has already signed in. Cannot resend invite.', alreadyClaimed: true }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        // Delete the pending user so we can re-invite
        await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
      } else {
        return new Response(
          JSON.stringify({ error: 'User already has an account', alreadyExists: true }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Send the invitation via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          name: name || normalizedEmail.split('@')[0],
          team: team || '',
          role: role || 'member'
        },
        redirectTo: 'https://ddpopmatters.github.io/PM-Productivity-Tool/'
      }
    )

    if (inviteError) {
      console.error('Invite error:', inviteError)
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update or create the user_profiles record
    await supabaseAdmin
      .from('user_profiles')
      .upsert([{
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        team: team || '',
        role: role || 'member',
        invited_at: new Date().toISOString(),
        invited_by: user.email
      }], { onConflict: 'email' })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${normalizedEmail}`,
        userId: inviteData.user?.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
