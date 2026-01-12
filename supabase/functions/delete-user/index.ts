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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
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
        JSON.stringify({ error: 'Only admins can delete users' }),
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

    // Prevent self-deletion
    if (normalizedEmail === user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find user in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const targetUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail)

    // Delete from auth.users if exists
    if (targetUser) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id)
      if (deleteAuthError) {
        console.error('Failed to delete from auth:', deleteAuthError)
        return new Response(
          JSON.stringify({ error: 'Failed to delete user from authentication system' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Delete from user_profiles
    const { error: deleteProfileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('email', normalizedEmail)

    if (deleteProfileError) {
      console.error('Failed to delete profile:', deleteProfileError)
      // Don't fail if profile doesn't exist
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${normalizedEmail} has been deleted`,
        authDeleted: !!targetUser
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
