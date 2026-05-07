import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Shield,
  Lock,
  CreditCard,
  CheckCircle,
  Loader2,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { usePayment } from '@/hooks/usePayment';
import { toast } from '@/hooks/use-toast';

import type { Booking } from '@/types/booking';
import type { CardDetails, PaymentIntent } from '@/types/payment';

const cardSchema = z.object({
  cardholderName: z
    .string()
    .min(2, 'Cardholder name is required'),

  cardNumber: z
    .string()
    .min(13, 'Card number must be at least 13 digits')
    .max(19, 'Card number is too long'),

  expiry: z
    .string()
    .regex(
      /^(0[1-9]|1[0-2])\/\d{2}$/,
      'Enter a valid expiry date (MM/YY)'
    ),

  cvc: z
    .string()
    .min(3, 'CVC must be 3 digits')
    .max(4, 'CVC is too long'),
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

const PaymentPage = ({
  bookingData,
  onPaymentSuccess,
  onCancel,
}: PaymentPageProps) => {
  const navigate = useNavigate();

  const [paymentIntent, setPaymentIntent] =
    useState<PaymentIntent | null>(null);

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardholderName: '',
      cardNumber: '',
      expiry: '',
      cvc: '',
    },
  });

  const parsedSeatNumbers = bookingData.seatNumbers
    .split(',')
    .map((seat) => Number(seat.trim()))
    .sort((a, b) => a - b);

  const {
    processPayment,
    loading,
    completeBookingAfterPayment,
  } = usePayment({
    bookingData: {
      ...bookingData,
      seatNumbers: parsedSeatNumbers,
      totalAmount: bookingData.totalAmount,
    },
  });

  const onSubmit = async (data: CardFormData) => {
    try {
      const cardDetails: CardDetails = {
        number: data.cardNumber.replace(/\s/g, ''),
        expiry: data.expiry,
        cvc: data.cvc,
        name: data.cardholderName,
      };

      const paymentResult = await processPayment(cardDetails);

      if (paymentResult?.status === 'success') {
        const bookings = await completeBookingAfterPayment(
          paymentResult
        );

        if (bookings) {
          toast({
            title: 'Payment Successful',
            description: 'Your booking has been confirmed.',
          });

          onPaymentSuccess(bookings);
        }
      } else {
        toast({
          title: 'Payment Failed',
          description: 'Unable to complete payment.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Payment error:', error);

      toast({
        title: 'Error',
        description: 'Something went wrong while processing payment.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-300">
        <Card className="overflow-hidden border-0 shadow-2xl rounded-3xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Shield className="w-6 h-6" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold">
                    Secure Payment
                  </h2>

                  <p className="text-sm text-purple-100">
                    Powered by PayHere
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-purple-100">
                  Total Amount
                </p>

                <h3 className="text-2xl font-bold">
                  LKR{' '}
                  {bookingData.totalAmount.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/20">
                <Lock className="w-3 h-3 mr-1" />
                SSL Secure
              </Badge>

              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/20">
                <Shield className="w-3 h-3 mr-1" />
                PCI DSS
              </Badge>

              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Fraud Protected
              </Badge>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Booking Summary */}
            <div className="bg-muted/50 rounded-2xl p-5 border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Booking Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Seats
                  </span>

                  <span className="font-medium">
                    #{bookingData.seatNumbers}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Route
                  </span>

                  <span className="font-medium">
                    {bookingData.routeName}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Date
                  </span>

                  <span className="font-medium">
                    {new Date(
                      bookingData.date
                    ).toLocaleDateString('en-LK')}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Passenger
                  </span>

                  <span className="font-medium">
                    {bookingData.passengerName}
                  </span>
                </div>

                <div className="border-t pt-3 flex justify-between text-lg font-bold text-primary">
                  <span>Total</span>

                  <span>
                    LKR{' '}
                    {bookingData.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                {/* Cardholder Name */}
                <FormField
                  control={form.control}
                  name="cardholderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Cardholder Name
                      </FormLabel>

                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          {...field}
                        />
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
                      <FormLabel>
                        Card Number
                      </FormLabel>

                      <FormControl>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                          <Input
                            className="pl-10"
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            {...field}
                            onChange={(e) => {
                              const value =
                                e.target.value
                                  .replace(/\D/g, '')
                                  .replace(
                                    /(.{4})/g,
                                    '$1 '
                                  )
                                  .trim();

                              field.onChange(value);
                            }}
                          />
                        </div>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Expiry + CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry</FormLabel>

                        <FormControl>
                          <Input
                            placeholder="MM/YY"
                            maxLength={5}
                            {...field}
                            onChange={(e) => {
                              let value =
                                e.target.value.replace(
                                  /\D/g,
                                  ''
                                );

                              if (value.length >= 3) {
                                value = `${value.slice(
                                  0,
                                  2
                                )}/${value.slice(2, 4)}`;
                              }

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
                        <FormLabel>CVC</FormLabel>

                        <FormControl>
                          <Input
                            type="password"
                            placeholder="123"
                            maxLength={4}
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-lg font-semibold rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Pay LKR{' '}
                      {bookingData.totalAmount.toLocaleString()}
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Footer */}
            <div className="border-t pt-4 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-600" />

                <span>
                  Your payment is secured with bank-grade
                  encryption
                </span>
              </div>

              <p>
                Powered by{' '}
                <span className="font-semibold text-primary">
                  PayHere
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cancel Button */}
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            className="text-white hover:bg-white/10"
          >
            Cancel & Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;