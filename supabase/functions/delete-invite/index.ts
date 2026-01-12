import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
