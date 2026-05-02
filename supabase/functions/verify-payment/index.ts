// Supabase Edge Function to verify PayHere payment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, bookingId } = await req.json();

    if (!orderId && !bookingId) {
      throw new Error("Missing orderId or bookingId");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query payment by order_id or booking_id
    let query = supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (orderId) {
      query = query.eq("payhere_order_id", orderId);
    } else if (bookingId) {
      query = query.eq("booking_id", bookingId);
    }

    const { data: payment, error } = await query.limit(1).single();

    if (error || !payment) {
      throw new Error("Payment not found");
    }

    return new Response(JSON.stringify(payment), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
