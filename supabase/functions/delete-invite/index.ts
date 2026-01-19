import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxAttempts: 10,      // Max 10 invite deletes per window
  windowMinutes: 60,    // 1 hour window
  blockMinutes: 30      // Block for 30 minutes if exceeded
}

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the calling user's token and check if they're admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
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
        JSON.stringify({ error: 'Only admins can delete invites' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting check using database function
    const { data: rateLimitResult, error: rateLimitError } = await supabaseAdmin.rpc(
      'check_rate_limit',
      {
        p_identifier: user.email?.toLowerCase() || 'unknown',
        p_action_type: 'delete_invite',
        p_max_attempts: RATE_LIMIT_CONFIG.maxAttempts,
        p_window_minutes: RATE_LIMIT_CONFIG.windowMinutes,
        p_block_minutes: RATE_LIMIT_CONFIG.blockMinutes
      }
    )

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError)
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      await supabaseAdmin.rpc('log_security_event', {
        p_event_type: 'rate_limited',
        p_user_email: user.email?.toLowerCase(),
        p_details: { action: 'delete_invite', blocked_until: rateLimitResult.blocked_until }
      })

      return new Response(
        JSON.stringify({
          error: rateLimitResult.message || 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.blocked_until
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '1800' } }
      )
    }

    // Get request body
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (existingUser) {
      // Check if user has actually signed in
      if (existingUser.last_sign_in_at) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete - user has already signed in', alreadyClaimed: true }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // Delete the pending auth user
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
    }

    // Delete from user_profiles
    const { error: deleteError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('email', normalizedEmail)

    if (deleteError) {
      console.error('Delete profile error:', deleteError)
      // Don't fail if profile doesn't exist
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invite deleted for ${normalizedEmail}`
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
