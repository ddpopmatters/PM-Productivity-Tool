import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxAttempts: 10,      // Max 10 invites per window
  windowMinutes: 60,    // 1 hour window
  blockMinutes: 30      // Block for 30 minutes if exceeded
}

// Security: Restrict CORS to only allowed origins
const APP_URL = Deno.env.get('APP_URL') || 'https://ddpopmatters.github.io/PM-Productivity-Tool'
const ALLOWED_ORIGINS = [
  'https://ddpopmatters.github.io',
  APP_URL
]
const VALID_ROLES = ['admin', 'member', 'manager'] as const
type ValidRole = (typeof VALID_ROLES)[number]

function createAdminClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

type AdminClient = ReturnType<typeof createAdminClient>

function isDuplicateKeyError(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false
  }

  return error.code === '23505'
    || error.message?.toLowerCase().includes('duplicate key value') === true
}

function isValidRole(role: unknown): role is ValidRole {
  return typeof role === 'string' && VALID_ROLES.some((candidate) => candidate === role)
}

async function findAuthUserByEmail(supabaseAdmin: AdminClient, normalizedEmail: string) {
  const perPage = 200
  let page = 1

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('List users error:', error)
      return null
    }

    const users = data?.users ?? []
    const match = users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail)
    if (match) {
      return match
    }

    if (users.length < perPage) {
      return null
    }

    page += 1
  }
}

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

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

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

    // Rate limiting check using database function
    const { data: rateLimitResult, error: rateLimitError } = await supabaseAdmin.rpc(
      'check_rate_limit',
      {
        p_identifier: user.email?.toLowerCase() || 'unknown',
        p_action_type: 'invite_user',
        p_max_attempts: RATE_LIMIT_CONFIG.maxAttempts,
        p_window_minutes: RATE_LIMIT_CONFIG.windowMinutes,
        p_block_minutes: RATE_LIMIT_CONFIG.blockMinutes
      }
    )

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError)
      // Continue without rate limiting if the check fails (fail open for usability)
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      // Log the rate limit event
      await supabaseAdmin.rpc('log_security_event', {
        p_event_type: 'rate_limited',
        p_user_email: user.email?.toLowerCase(),
        p_details: { action: 'invite_user', blocked_until: rateLimitResult.blocked_until }
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
    const { email, name, team, role, resend } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (role !== undefined && role !== null && !isValidRole(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be admin, member, or manager.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedRole: ValidRole = isValidRole(role) ? role : 'member'

    // Check if user already exists in auth
    const existingUser = await findAuthUserByEmail(supabaseAdmin, normalizedEmail)

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
          role: normalizedRole
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

    // Preserve any admin-edited profile fields when resending an invite.
    const invitedAt = new Date().toISOString()
    const profilePayload = {
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase()),
      team: team || '',
      role: normalizedRole,
      invited_at: invitedAt,
      invited_by: user.email
    }

    const { error: insertProfileError } = await supabaseAdmin
      .from('user_profiles')
      .insert(profilePayload)

    if (insertProfileError) {
      if (!isDuplicateKeyError(insertProfileError)) {
        console.error('Profile insert error:', insertProfileError)
        return new Response(
          JSON.stringify({ error: 'Failed to store invited user profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateProfileError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          invited_at: invitedAt,
          invited_by: user.email
        })
        .eq('email', normalizedEmail)

      if (updateProfileError) {
        console.error('Profile update error:', updateProfileError)
        return new Response(
          JSON.stringify({ error: 'Failed to refresh invited user profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

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
