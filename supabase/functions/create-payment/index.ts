// Supabase Edge Function to create PayHere payment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  bookingId: string;
  amount: number;
  customerEmail: string;
  customerPhone: string;
  routeName: string;
}

interface PayHereResponse {
  order_id: string;
  payment_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bookingId, amount, customerEmail, customerPhone, routeName }: PaymentRequest = await req.json();

    if (!bookingId || !amount || !customerEmail) {
      throw new Error("Missing required fields");
    }

    // Get environment variables
    const payhereMerchantId = Deno.env.get("PAYHERE_MERCHANT_ID") || "122XXXX";
    const payhereSecret = Deno.env.get("PAYHERE_SECRET") || "MjMzNDgyMTc1NTE4NTY5MTUzMzU5Mg==";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate unique PayHere order ID
    const timestamp = Date.now();
    const payhereOrderId = `BH${timestamp}${Math.floor(Math.random() * 10000)}`;

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        booking_id: bookingId,
        amount: amount,
        currency: "LKR",
        customer_email: customerEmail,
        customer_phone: customerPhone,
        payhere_order_id: payhereOrderId,
        status: "pending",
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment record error:", paymentError);
      throw new Error("Failed to create payment record");
    }

    // Generate hash for PayHere
    const hashString = `${payhereMerchantId}${payhereOrderId}${amount}${payhereSecret}`;
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const hash = btoa(hashHex);

    // Determine environment (sandbox or production)
    const isSandbox = Deno.env.get("PAYHERE_MODE") !== "live";
    
// PayHere checkout URL
    const payhereUrl = isSandbox
      ? "https://sandbox.payhere.lk/pay/checkout"
      : "https://www.payhere.lk/pay/checkout";

    // Build payment URL with params
    const paymentParams = new URLSearchParams({
      merchant_id: payhereMerchantId,
      return_url: `${req.headers.get("origin") || "http://localhost:5173"}/payment/return`,
      cancel_url: `${req.headers.get("origin") || "http://localhost:5173"}/payment/cancel`,
      notify_url: `${supabaseUrl}/functions/v1/handle-notify`,
      order_id: payhereOrderId,
      items: `Bus Ticket - ${routeName}`,
      amount: amount.toString(),
      currency: "LKR",
      custom_1: payment.id,
      custom_2: bookingId,
      hash: hash,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      billing_name: customerEmail.split("@")[0],
      billing_country: "Sri Lanka",
      billing_email: customerEmail,
    });

    const paymentUrl = `${payhereUrl}?${paymentParams.toString()}`;

    const response: PayHereResponse = {
      order_id: payhereOrderId,
      payment_url: paymentUrl,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
