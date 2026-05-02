/**
 * PayHere Direct Checkout Integration
 * Uses PayHere's JS library for client-side payment processing
 */

// PayHere Sandbox Merchant ID - Replace with your actual merchant ID for production
const MERCHANT_ID = "122XXXX"; // Replace with your PayHere merchant ID
const MERCHANT_SECRET = "MjMzNDgyMTc1NTE4NTY5MTUzMzU5Mg=="; // Replace with your PayHere secret

export interface PayHereDirectConfig {
  merchantId: string;
  orderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone: string;
  routeName: string;
  bookingId: string;
}

/**
 * Initialize PayHere payment with direct checkout
 * This opens PayHere's popup checkout
 */
export function initPayHerePayment(config: PayHereDirectConfig): Promise<{ status: string; transactionId?: string }> {
  return new Promise((resolve, reject) => {
    // Build payment data
    const paymentData = {
      sandbox: true, // Set to false for production
      merchant_id: MERCHANT_ID,
      return_url: window.location.origin + "/payment/return",
      cancel_url: window.location.host + "/payment/cancel",
      notify_url: "", // Can be set for webhook notifications
      order_id: config.orderId,
      items: `Bus Ticket - ${config.routeName}`,
      amount: config.amount,
      currency: config.currency,
      custom_1: config.bookingId,
      custom_2: config.orderId,
      customer_email: config.customerEmail,
      customer_phone: config.customerPhone,
      billing_name: config.customerEmail.split("@")[0],
      billing_country: "Sri Lanka",
      billing_email: config.customerEmail,
      billing_phone: config.customerPhone,
    };

    // Use PayHere's embedded checkout method
    // This requires payhere.js script to be loaded in index.html
    const payhere = (window as any).payhere;

    if (!payhere) {
      // If PayHere.js not loaded, redirect to standard checkout
      console.warn("PayHere.js not loaded, using redirect checkout");
      initiateRedirectCheckout(config);
      resolve({ status: "redirected" });
      return;
    }

    // Payment completed callback
    payhere.onCompleted = function onCompleted(orderId: string) {
      console.log("Payment completed for order:", orderId);
      resolve({ status: "success", transactionId: orderId });
    };

    // Payment dismissed callback
    payhere.onDismissed = function onDismissed() {
      console.log("Payment dismissed by user");
      reject(new Error("Payment was cancelled by user"));
    };

    // Payment error callback
    payhere.onError = function onError(error: string) {
      console.error("PayHere error:", error);
      reject(new Error(error || "Payment failed. Please try again."));
    };

    // Start payment
    try {
      payhere.checkout(paymentData);
    } catch (error: any) {
      console.error("Error starting PayHere payment:", error);
      // Fallback to redirect
      initiateRedirectCheckout(config);
      resolve({ status: "redirected" });
    }
  });
}

/**
 * Fallback redirect checkout method
 */
function initiateRedirectCheckout(config: PayHereDirectConfig) {
  const isSandbox = true; // Change to false for production
  const payhereUrl = isSandbox
    ? "https://sandbox.payhere.lk/pay/checkout"
    : "https://www.payhere.lk/pay/checkout";

  const params = new URLSearchParams({
    merchant_id: MERCHANT_ID,
    return_url: window.location.origin + "/payment/return",
    cancel_url: window.location.origin + "/payment/cancel",
    notify_url: "",
    order_id: config.orderId,
    items: `Bus Ticket - ${config.routeName}`,
    amount: config.amount.toString(),
    currency: config.currency,
    custom_1: config.bookingId,
    custom_2: config.orderId,
    customer_email: config.customerEmail,
    customer_phone: config.customerPhone,
    billing_name: config.customerEmail.split("@")[0],
    billing_country: "Sri Lanka",
    billing_email: config.customerEmail,
    billing_phone: config.customerPhone,
  });

  window.location.href = `${payhereUrl}?${params.toString()}`;
}

/**
 * Generate unique order ID
 */
export function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `BH${timestamp}${random}`;
}

/**
 * Verify payment after returning from PayHere
 * This can be called to verify the payment status
 */
export async function verifyPayment(orderId: string): Promise<{ success: boolean; status: string }> {
  // In a real implementation, you would call your backend to verify
  // For now, we'll check URL params
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get("status");

  if (status === "success") {
    return { success: true, status: "success" };
  }

  return { success: false, status: status || "pending" };
}

/**
 * Check if returning from PayHere payment
 */
export function isReturningFromPayment(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has("order_id") || urlParams.has("status");
}

/**
 * Get payment result from URL
 */
export function getPaymentResult(): { orderId: string | null; status: string | null } {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    orderId: urlParams.get("order_id"),
    status: urlParams.get("status"),
  };
}
