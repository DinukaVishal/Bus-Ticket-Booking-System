import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, CreditCard, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { PaymentIntent, CardDetails, PAYHERE_CONFIG } from '@/types/payment';
import { Booking } from '@/types/booking';
import { usePayment } from '@/hooks/usePayment';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const cardSchema = z.object({
  cardNumber: z.string().min(13, 'Card number must be at least 13 digits').max(19, 'Card number too long'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Enter valid expiry (MM/YY)'),
  cvc: z.string().min(3, 'CVC must be 3-4 digits').max(4, 'CVC too long'),
  cardholderName: z.string().min(2, 'Name required'),
});

type CardFormData = z.infer<typeof cardSchema>;

interface PaymentPageProps {
  bookingData: {
    tripId: string;
    routeId: string;
    routeName: string;
    date: string;
    seatNumbers: string;
    passengerName: string;
    phoneNumber: string;
    totalAmount: number;
  };
  onPaymentSuccess: (bookings: Booking[]) => void;
  onCancel: () => void;
}

const PaymentPage = ({ bookingData, onPaymentSuccess, onCancel }: PaymentPageProps) => {
  const navigate = useNavigate();
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardNumber: '',
      expiry: '',
      cvc: '',
      cardholderName: '',
    },
  });

  const { processPayment, loading, completeBookingAfterPayment } = usePayment({ 
    bookingData: {
      ...bookingData,
      totalAmount: bookingData.totalAmount,
      seatNumbers: bookingData.seatNumbers.split(', ').map(Number).sort((a,b)=>a-b),
    } 
  });

  const onSubmit = async (data: CardFormData) => {
    const cardDetails: CardDetails = {
      number: data.cardNumber.replace(/\\s/g, ''),
      expiry: data.expiry,
      cvc: data.cvc,
      name: data.cardholderName,
    };

    const paymentResult = await processPayment(cardDetails);
    
    if (paymentResult?.status === 'success') {
      const bookings = await completeBookingAfterPayment(paymentResult);
      
      if (bookings) {
        onPaymentSuccess(bookings);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"></div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Popup Container */}
      <div className="relative w-full max-w-lg animate-in zoom-in-95 duration-300 ease-out">
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute -top-12 right-0 z-10 text-white/80 hover:text-white transition-colors disabled:opacity-50"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Main Payment Card */}
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-6 text-white relative overflow-hidden">
            {/* Header background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full translate-y-12 -translate-x-12"></div>
            </div>

            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Secure Payment</h2>
                  <p className="text-purple-100 text-sm">PayHere Certified</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">LKR {bookingData.totalAmount.toLocaleString()}</div>
                <div className="text-purple-100 text-xs">Total Amount</div>
              </div>
            </div>

            {/* Security badges */}
            <div className="relative flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                <Lock className="w-3 h-3" />
                <span className="text-xs font-medium">256-bit SSL</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                <Shield className="w-3 h-3" />
                <span className="text-xs font-medium">PCI DSS</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs font-medium">Fraud Protected</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Booking Summary */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-5 mb-6 border border-gray-200/50 shadow-inner">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Booking Summary
              </h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Seats</span>
                    <span className="font-semibold text-gray-800">#{bookingData.seatNumbers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Route</span>
                    <span className="font-semibold text-gray-800">{bookingData.routeName}</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="font-semibold text-gray-800">{new Date(bookingData.date).toLocaleDateString('en-LK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Passenger</span>
                    <span className="font-semibold text-gray-800">{bookingData.passengerName}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-300/50 mt-4 pt-4">
                <div className="flex justify-between items-center text-lg font-bold text-purple-600">
                  <span>Total Amount</span>
                  <span>LKR {bookingData.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Cardholder Name */}
                <FormField
                  control={form.control}
                  name="cardholderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-semibold text-sm">Cardholder Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="John Doe"
                            className="pl-11 h-11 text-base border-2 border-gray-200 focus:border-purple-500 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-purple-500/20"
                            {...field}
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-bold text-xs">👤</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Card Number */}
                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-semibold text-sm">Card Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
                          <Input
                            className="pl-11 h-11 text-base border-2 border-gray-200 focus:border-purple-500 rounded-xl font-mono tracking-wider transition-all duration-200 focus:ring-2 focus:ring-purple-500/20"
                            placeholder="1234 5678 9012 3456"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                              field.onChange(value);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Expiry and CVC */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-semibold text-sm">Expiry Date</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="MM/YY"
                            maxLength={5}
                            className="h-11 text-base border-2 border-gray-200 focus:border-purple-500 rounded-xl font-mono transition-all duration-200 focus:ring-2 focus:ring-purple-500/20"
                            {...field}
                            onChange={(e) => {
                              let value = e.target.value;
                              if (/^\d{2}$/.test(value)) value += '/';
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cvc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-semibold text-sm">CVC</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="123"
                            maxLength={4}
                            className="h-11 text-base border-2 border-gray-200 focus:border-purple-500 rounded-xl font-mono transition-all duration-200 focus:ring-2 focus:ring-purple-500/20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pay Button */}
                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 shadow-xl rounded-xl transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Pay LKR {bookingData.totalAmount.toLocaleString()}
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Security Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200/50 text-center">
              <div className="flex items-center justify-center gap-2 mb-2 text-gray-600">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="font-medium text-sm">Your payment is protected by bank-grade security</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
                <span>🔒 SSL Encrypted</span>
                <span>•</span>
                <span>🛡️ Fraud Protection</span>
                <span>•</span>
                <span>💳 PayHere Secure</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl px-4 py-2 text-sm transition-all duration-200 disabled:opacity-50"
            disabled={loading}
          >
            ← Back to Booking Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
