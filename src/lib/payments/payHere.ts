import { supabase } from "@/integrations/supabase/client";

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  customerEmail: string;
  customerPhone: string;
  routeName: string;
}

export interface PaymentResponse {
  order_id: string;
  payment_url: string;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "cancelled" | "charged_back";
  payment_method: string | null;
  transaction_id: string | null;
  customer_email: string;
  customer_phone: string;
  payhere_order_id: string;
  payhere_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a PayHere payment and get the checkout URL
 */
export async function createPayHerePayment(
  request: PaymentRequest
): Promise<PaymentResponse> {
  const { data, error } = await supabase.functions.invoke("create-payment", {
    body: request,
  });

  if (error) {
    console.error("Error creating payment:", error);
    throw new Error(error.message || "Failed to create payment");
  }

  return data as PaymentResponse;
}

/**
 * Verify a payment by order ID or booking ID
 */
export async function verifyPayHerePayment(
  orderId?: string,
  bookingId?: string
): Promise<PaymentRecord> {
  const { data, error } = await supabase.functions.invoke("verify-payment", {
    body: { orderId, bookingId },
  });

  if (error) {
    console.error("Error verifying payment:", error);
    throw new Error(error.message || "Failed to verify payment");
  }

  return data as PaymentRecord;
}

/**
 * Redirect user to PayHere payment URL
 */
export function redirectToPayHere(paymentUrl: string): void {
  window.location.href = paymentUrl;
}

/**
 * Check if we're returning from PayHere payment
 */
export function isReturningFromPayment(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has("order_id") || urlParams.has("booking_id");
}

/**
 * Get payment return info from URL
 */
export function getPaymentReturnInfo(): {
  orderId: string | null;
  bookingId: string | null;
  status: string | null;
} {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    orderId: urlParams.get("order_id"),
    bookingId: urlParams.get("booking_id"),
    status: urlParams.get("status"),
  };
}

/**
 * Calculate hash for PayHere (for frontend verification if needed)
 */
export async function calculatePayHereHash(
  merchantId: string,
  orderId: string,
  amount: number,
  secret: string
): Promise<string> {
  const hashString = `${merchantId}${orderId}${amount}${secret}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return btoa(hashHex);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = "LKR"): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

/**
 * Get Payment status display text
 */
export function getPaymentStatusText(
  status: PaymentRecord["status"]
): { text: string; variant: "default" | "success" | "warning" | "destructive" } {
  switch (status) {
    case "success":
      return { text: "Paid", variant: "success" };
    case "pending":
      return { text: "Pending", variant: "warning" };
    case "failed":
      return { text: "Failed", variant: "destructive" };
    case "cancelled":
      return { text: "Cancelled", variant: "destructive" };
    case "charged_back":
      return { text: "Charged Back", variant: "destructive" };
    default:
      return { text: status, variant: "default" };
  }
}
