import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { PaymentIntent, CardDetails, PAYHERE_CONFIG } from '@/types/payment';
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
  onPaymentSuccess: (bookings: any[]) => void;
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
      seatNumbers: bookingData.seatNumbers.split(',').map(Number).sort((a,b)=>a-b),
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
      const bookings = await completeBookingAfterPayment(paymentResult, {
        ...bookingData,
        seatNumbers: bookingData.seatNumbers.split(',').map(Number).sort((a,b)=>a-b),
      });
      
      if (bookings) {
        onPaymentSuccess(bookings);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 py-12 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-8 shadow-card hover:shadow-card-hover transition-all">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Secure Payment</CardTitle>
                <CardDescription>Complete your booking with secure payment</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                <Lock className="w-3 h-3 mr-1" /> PCI-DSS Level 1
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                SSL Encrypted
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                PayHere Certified
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Main Payment Card */}
        <Card className="shadow-2xl border-0 max-w-md mx-auto animate-scale-in">
          <CardHeader className="text-center pb-2">
            <h2 className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
              Review & Pay LKR {bookingData.totalAmount.toLocaleString()}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {bookingData.seatNumbers} • {bookingData.routeName} • {new Date(bookingData.date).toLocaleDateString()}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 p-8">
            {/* Booking Summary */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
              <div className="flex justify-between text-sm font-medium">
                <span>Seat{bookingData.seatNumbers.includes(',') ? 's' : ''}</span>
                <span>#{bookingData.seatNumbers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Route</span>
                <span className="font-medium">{bookingData.routeName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Date</span>
                <span>{new Date(bookingData.date).toLocaleDateString('en-LK')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Passenger</span>
                <span>{bookingData.passengerName}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between text-lg font-bold text-primary">
                <span>Total</span>
                <span>LKR {bookingData.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cardholderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cardholder Name</FormLabel>
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
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            className="pl-10" 
                            placeholder="1234 5678 9012 3456"
                            {...field}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\\D/g, '').replace(/(.{4})/g, '$1 ').trim();
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
                              if (/^\\d{2}$/.test(value)) value += '/';
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

                <Button type="submit" className="w-full h-14 text-lg font-semibold shadow-lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
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
            <div className="pt-6 border-t border-border text-xs text-muted-foreground text-center space-y-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-4 h-4" />
                <span>Your payment is protected with bank-grade encryption</span>
              </div>
              <div className="flex flex-wrap justify-center gap-1">
                <span>Powered by</span>
                <span className="font-semibold text-primary">PayHere</span>
                <span>• Secure payments for Sri Lanka</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancel Button */}
        <div className="text-center mt-8">
          <Button 
            variant="ghost" 
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
            disabled={loading}
          >
            Cancel & Edit Booking
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
