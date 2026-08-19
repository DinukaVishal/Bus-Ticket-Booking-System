// =====================================================================
// Compliance Monitor Edge Function
//
// Scheduled job (cron) that runs the automatic expiry check on
// compliance documents. It calls the SECURITY DEFINER RPC
// `run_compliance_expiry_check()` which:
//   - Finds documents that have expired (expiry_date < today)
//   - Finds documents expiring within 90 / 60 / 30 / 7 / 1 days
//   - Updates the status accordingly (expired / expiring_soon / valid)
//   - Fires notification triggers for affected owners
//   - Recomputes compliance scores for affected owners
//
// Deploy:
//   supabase functions deploy monitor-compliance --no-verify-jwt
//
// Cron schedule (in config.toml or dashboard):
//   - Runs every 6 hours:  0 */6 * * *
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing env vars.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service role client bypasses RLS - only used for the scheduled check.
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Run the core expiry check (status updates + triggers + scores)
    const { data, error } = await supabase.rpc('run_compliance_expiry_check');
    if (error) {
      throw error;
    }

    const result = (data as { success: boolean; updated?: number }) || {
      success: true,
      updated: 0,
    };

    // 2. Fire granular 90/60/30/7/1-day reminders
    const { data: expiring, error: expiringError } = await supabase
      .rpc('get_expiring_documents', { _days: 90 });

    if (!expiringError && Array.isArray(expiring)) {
      const windows = [90, 60, 30, 7, 1];
      for (const doc of expiring as any[]) {
        const days = Number(doc.days_remaining);
        if (Number.isNaN(days) || days < 0) continue;

        // Only fire when days remaining matches one of the exact windows,
        // so each document gets one reminder per threshold.
        const exact = windows.find((w) => days === w);
        if (!exact) continue;

        const title =
          days === 0
            ? 'Compliance Document Expires Today'
            : days === 1
              ? 'Compliance Document Expires Tomorrow'
              : `Compliance Document Expires in ${days} Days`;

        const message = `Document ${doc.document_number} (${doc.document_type}) expires on ${doc.expiry_date}.`;

        await supabase.rpc('create_notification', {
          _user_id: doc.owner_id,
          _title: title,
          _message: message,
          _type: 'compliance',
          _entity_type: 'compliance_document',
          _entity_id: doc.id,
          _link: '/owner/compliance',
        });
      }
    }

    console.log(
      `[monitor-compliance] completed. updated=${result.updated ?? 0}`
    );

    return new Response(JSON.stringify({ ...result, granular: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('[monitor-compliance] error', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

