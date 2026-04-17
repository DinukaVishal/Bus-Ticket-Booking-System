import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This is the setup code - in production, use an environment variable
const ADMIN_SETUP_CODE = 'QUICKBUS-ADMIN-2024';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user token
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { setupCode } = await req.json();

    // Validate setup code SERVER-SIDE
    if (setupCode !== ADMIN_SETUP_CODE) {
      return new Response(
        JSON.stringify({ error: 'Invalid setup code' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if any admin already exists
    const { count: adminCount, error: countError } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) {
      throw countError;
    }

    if ((adminCount || 0) > 0) {
      return new Response(
        JSON.stringify({ error: 'An admin already exists. Contact your system administrator.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has admin role
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (existingRole) {
      return new Response(
        JSON.stringify({ message: 'You already have admin access' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Grant admin role using service role (bypasses RLS)
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin',
      });

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ message: 'Admin access granted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Setup admin error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to setup admin';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
