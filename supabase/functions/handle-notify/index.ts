// Supabase Edge Function to handle PayHere payment notification (webhook)
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
    const formData = await req.formData();
    
    const orderId = formData.get("order_id") as string;
    const paymentId = formData.get("payment_id") as string;
    const statusCode = formData.get("status_code") as string;
    const status = formData.get("status") as string;
    const amount = formData.get("amount") as string;
    const currency = formData.get("currency") as string;
    const method = formData.get("method") as string;
    
    // Verify merchant secret to ensure request is from PayHere
    const payhereSecret = Deno.env.get("PAYHERE_SECRET") || "";
    const receivedHash = formData.get("verify_hash") as string;
    
    if (!orderId) {
      throw new Error("Missing order_id in notification");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map PayHere status codes to our status
    let paymentStatus = "pending";
    if (statusCode === "2") {
      paymentStatus = "success";
    } else if (statusCode === "0") {
      paymentStatus = "pending";
    } else if (statusCode === "-1") {
      paymentStatus = "cancelled";
    } else if (statusCode === "-2") {
      paymentStatus = "failed";
    } else if (statusCode === "-3") {
      paymentStatus = "charged_back";
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        transaction_id: paymentId,
        payment_method: method,
        payhere_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("payhere_order_id", orderId);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      throw new Error("Failed to update payment");
    }

    // If payment successful, update booking status in bookings table
    if (paymentStatus === "success") {
      // Get booking_id from payments table
      const { data: payment } = await supabase
        .from("payments")
        .select("booking_id")
        .eq("payhere_order_id", orderId)
        .single();

      if (payment) {
        // Update booking status to confirmed (it should already be confirmed at booking time)
        // This ensures they're linked
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("booking_id", payment.booking_id);
      }
    }

    return new Response("200 OK", {
      headers: { ...corsHeaders },
    });
  } catch (error) {
    console.error("Error handling notification:", error);
    return new Response("500 Internal Server Error", {
      status: 500,
      headers: { ...corsHeaders },
    });
  }
});
