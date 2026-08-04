// =====================================================================
// Delete Account Edge Function
//
// Securely deletes a user's account and all related data:
//   - Avatar files from the "avatars" storage bucket
//   - User preferences
//   - Profile row
//   - auth.users account (service role bypasses RLS)
//
// The service role key is NEVER exposed to the frontend; this function
// runs server-side with the service role.
//
// Security:
//   - The caller must be an authenticated user (JWT verified).
//   - Only the authenticated user's own account can be deleted.
//   - Foreign keys (ON DELETE CASCADE) clean up related rows:
//     profiles, user_roles, user_preferences, bookings, etc.
//
// Deploy:
//   supabase functions deploy delete-account
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Server configuration error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create a client with the user's JWT to verify identity.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: 'Not authenticated.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  // Verify the caller's identity.
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid authentication.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userId = user.id;

  // Service-role client (bypasses RLS) for deletion.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // 1. Delete avatar files from storage (list + remove).
    const { data: fileList, error: listError } = await admin.storage
      .from('avatars')
      .list(userId);

    if (listError) {
      console.error('[delete-account] list avatar error:', listError);
    } else if (fileList && fileList.length > 0) {
      const paths = fileList.map((f) => `${userId}/${f.name}`);
      const { error: removeError } = await admin.storage
        .from('avatars')
        .remove(paths);
      if (removeError) {
        console.error('[delete-account] remove avatar error:', removeError);
      }
    }

    // 2. Delete user preferences (cascade would handle this, but explicit
    //    for clarity and to surface any errors).
    const { error: prefsError } = await admin
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);
    if (prefsError) {
      console.error('[delete-account] delete preferences error:', prefsError);
    }

    // 3. Delete profile row.
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    if (profileError) {
      console.error('[delete-account] delete profile error:', profileError);
    }

    // 4. Delete the auth.users account. All related rows (user_roles,
    //    bookings, etc.) cascade via ON DELETE CASCADE.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    console.error('[delete-account] error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete account.';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
