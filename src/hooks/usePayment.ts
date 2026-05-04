import { useState, useCallback } from 'react';
import { PaymentIntent, CardDetails, PayHereResponse, PAYHERE_CONFIG, PaymentStatus } from '@/types/payment';
import { Booking } from '@/types/booking';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAddMultipleBookings } from './useBookings';

interface UsePaymentProps {
  bookingData: {
    tripId: string;
    routeId: string;
    routeName: string;
    date: string;
    seatNumbers: number[];
    passengerName: string;
    phoneNumber: string;
    totalAmount: number;
  };
}

export const usePayment = ({ bookingData }: UsePaymentProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const navigate = useNavigate();
  const addBookingsMutation = useAddMultipleBookings();

  // Simulate creating payment intent (in production: call Supabase)
  const createPaymentIntent = useCallback(async (): Promise<PaymentIntent> => {
    const intent: PaymentIntent = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: bookingData.totalAmount,
      currency: 'LKR',
      bookingData,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    // In production: POST to Supabase 'payment_intents'
    setPaymentIntent(intent);
    return intent;
  }, [bookingData]);

  // PayHere Integration (Sandbox)
  const processPayment = useCallback(async (cardDetails: CardDetails): Promise<PayHereResponse | null> => {
    setLoading(true);
    
    try {
      const paymentIntent = await createPaymentIntent();
      
      // PayHere Form Data (Sandbox)
      const payHereFormData = {
        merchant_id: PAYHERE_CONFIG.sandbox ? '121XXXX' : PAYHERE_CONFIG.merchant_id,
        return_url: PAYHERE_CONFIG.return_url,
        cancel_url: PAYHERE_CONFIG.cancel_url,
        notify_url: PAYHERE_CONFIG.notify_url,
        order_id: paymentIntent.id,
        items: 'Bus Ticket Booking',
        currency: 'LKR',
        amount: paymentIntent.amount.toString(),
        first_name: bookingData.passengerName.split(' ')[0],
        last_name: bookingData.passengerName.split(' ').slice(1).join(' ') || 'User',
        email: 'customer@example.com', // From auth context in future
        phone: bookingData.phoneNumber,
        address: `${bookingData.routeName}, Sri Lanka`,
        city: bookingData.routeName.split('→')[0].trim(),
        country: 'Sri Lanka',
        card_number: cardDetails.number.replace(/\\s/g, ''),
        expiry: cardDetails.expiry.replace('/', ''),
        cvc: cardDetails.cvc,
      };

      // Simulate PayHere processing (2s delay)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock success response (PayHere returns via return_url)
      const mockResponse: PayHereResponse = {
        order_id: paymentIntent.id,
        status: 'success' as const,
        payhere_amount: paymentIntent.amount,
        payhere_currency: 'LKR',
        merchant_id: payHereFormData.merchant_id,
      };

      toast({
        title: 'Payment Successful!',
        description: `LKR ${paymentIntent.amount.toLocaleString()} charged successfully.`,
      });

      return mockResponse;
    } catch (error) {
      toast({
        title: 'Payment Failed',
        description: 'Please try again or use a different card.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [bookingData, createPaymentIntent]);

  // Complete booking after payment (call from parent component)
  const completeBookingAfterPayment = useCallback(async (
    paymentResult: PayHereResponse | null
  ): Promise<Booking[] | null> => {
    if (!paymentResult?.status || paymentResult.status !== 'success') {
      return null;
    }

    try {
      // Create the actual bookings in the database
      const bookings = await addBookingsMutation.mutateAsync({
        tripId: bookingData.tripId,
        routeId: bookingData.routeId,
        routeName: bookingData.routeName,
        date: bookingData.date,
        seatNumbers: bookingData.seatNumbers,
        passengerName: bookingData.passengerName,
        phoneNumber: bookingData.phoneNumber,
        status: 'confirmed',
        paymentId: paymentResult.order_id,
        paymentStatus: 'paid',
      });

      toast({
        title: 'Booking Confirmed!',
        description: `Seats ${bookingData.seatNumbers.join(', ')} reserved successfully!`,
      });

      return bookings;
    } catch (error: any) {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Could not create booking after payment.',
        variant: 'destructive',
      });
      return null;
    }
  }, [bookingData, addBookingsMutation]);

  return {
    paymentIntent,
    loading,
    processPayment,
    completeBookingAfterPayment,
  };
};
