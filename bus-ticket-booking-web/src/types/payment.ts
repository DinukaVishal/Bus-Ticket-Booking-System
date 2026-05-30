export interface PaymentIntent {
  id: string;
  amount: number;
  currency: 'LKR';
  bookingData: {
    tripId: string;
    routeId: string;
    routeName: string;
    date: string;
    seatNumbers: number[];
    passengerName: string;
    phoneNumber: string;
  };
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  createdAt: string;
}

export interface CardDetails {
  number: string;
  expiry: string; // MM/YY
  cvc: string;
  name: string;
}

export interface PayHereResponse {
  order_id: string;
  status: 'success' | 'fail' | 'pending';
  payhere_amount: number;
  payhere_currency: string;
  merchant_id: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'mobile';
  label: string;
  icon: string;
}

// PayHere Sandbox Configuration (Sri Lanka)
export const PAYHERE_CONFIG = {
  sandbox: true,
  merchant_id: 'YOUR_MERCHANT_ID', // Replace after PayHere signup
  return_url: window.location.origin + '/booking',
  cancel_url: window.location.origin + '/booking',
  notify_url: window.location.origin + '/api/payment-webhook', // Future Supabase edge function
};

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
