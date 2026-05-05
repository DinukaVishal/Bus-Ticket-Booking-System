import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, CreditCard, Loader2 } from 'lucide-react';
import { PaymentIntent, CardDetails } from '@/types/payment';
import { Booking } from '@/types/booking';
import { usePayment } from '@/hooks/usePayment';
import { z } from 'zod';

const cardSchema = z.object({
  cardNumber: z.string().min(13).max(19),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/),
  cvc: z.string().min(3).max(4),
  cardholderName: z.string().min(2),
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
  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardNumber: '',
      expiry: '',
      cvc: '',
      cardholderName: '',
    },
  });

  const parsedSeats = bookingData.seatNumbers
    .split(',')
    .map((s) => Number(s.trim()))
    .sort((a, b) => a - b);

  const { processPayment, loading, completeBookingAfterPayment } = usePayment({
    bookingData: {
      ...bookingData,
      seatNumbers: parsedSeats,
    },
  });

  const onSubmit = async (data: CardFormData) => {
    const cardDetails: CardDetails = {
      number: data.cardNumber.replace(/\s/g, ''),
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 py-12 px-4">
      <div className="container max-w-2xl mx-auto">

        {/* Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <CardTitle>Secure Payment</CardTitle>
                <CardDescription>Complete your booking</CardDescription>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge>SSL Secured</Badge>
              <Badge>PCI DSS</Badge>
              <Badge>PayHere</Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Payment Card */}
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <h2 className="text-xl font-bold">
              Pay LKR {bookingData.totalAmount.toLocaleString()}
            </h2>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Seats</span>
                <span>#{bookingData.seatNumbers}</span>
              </div>
              <div className="flex justify-between">
                <span>Route</span>
                <span>{bookingData.routeName}</span>
              </div>
              <div className="flex justify-between">
                <span>Date</span>
                <span>{new Date(bookingData.date).toLocaleDateString('en-LK')}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>LKR {bookingData.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                <FormField
                  control={form.control}
                  name="cardholderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-3 w-4 h-4" />
                          <Input
                            className="pl-10"
                            placeholder="1234 5678 9012 3456"
                            {...field}
                            onChange={(e) => {
                              let value = e.target.value
                                .replace(/\D/g, '')
                                .replace(/(.{4})/g, '$1 ')
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
                        <FormLabel>CVC</FormLabel>
                        <FormControl>
                          <Input type="password" maxLength={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Pay LKR {bookingData.totalAmount.toLocaleString()}
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Footer */}
            <div className="text-xs text-center text-muted-foreground">
              Secure payment powered by PayHere
            </div>

          </CardContent>
        </Card>

        {/* Cancel */}
        <div className="text-center mt-6">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </div>

      </div>
    </div>
  );
};

export default PaymentPage;