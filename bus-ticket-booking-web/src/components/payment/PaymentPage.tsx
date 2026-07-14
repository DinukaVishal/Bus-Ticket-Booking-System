import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Shield, Lock, CreditCard, CheckCircle, Loader2, Check } from 'lucide-react';
import { PaymentIntent, CardDetails } from '@/types/payment';
import { Booking } from '@/types/booking';
import { usePayment } from '@/hooks/usePayment';
import { useOffers, Offer } from '@/hooks/useOffers';
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
    gender: 'male' | 'female';
    totalAmount: number;
  };
  onPaymentSuccess: (bookings: Booking[]) => void;
  onCancel: () => void;
}

const PaymentPage = ({ bookingData, onPaymentSuccess, onCancel }: PaymentPageProps) => {
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardNumber: '',
      expiry: '',
      cvc: '',
      cardholderName: '',
    },
  });

  const { data: offers = [] } = useOffers(true);

  const discountAmount = useMemo(() => {
    if (!appliedOffer) return 0;
    if (appliedOffer.discount_amount) return Number(appliedOffer.discount_amount);
    if (appliedOffer.discount_percent) {
      return Math.round((bookingData.totalAmount * Number(appliedOffer.discount_percent)) / 100);
    }
    return 0;
  }, [appliedOffer, bookingData.totalAmount]);

  const discountedTotal = Math.max(0, bookingData.totalAmount - discountAmount);

  const paymentBookingData = useMemo(() => ({
    ...bookingData,
    totalAmount: discountedTotal,
    seatNumbers: bookingData.seatNumbers.split(', ').map(Number).sort((a,b)=>a-b),
    gender: bookingData.gender,
  }), [bookingData, discountedTotal]);

  const { processPayment, loading, completeBookingAfterPayment } = usePayment({ bookingData: paymentBookingData });

  const validateOffer = (offer: Offer) => {
    const today = new Date();
    if (!offer.is_active) return false;
    if (offer.route_id && offer.route_id !== bookingData.routeId) return false;
    if (offer.starts_at && new Date(offer.starts_at) > today) return false;
    if (offer.ends_at && new Date(offer.ends_at) < today) return false;
    return true;
  };

  const applyPromoCode = () => {
    setPromoError('');
    const trimmed = promoCode.trim();
    if (!trimmed) {
      setPromoError('Please enter a promo code.');
      return;
    }

    const matchingOffer = offers.find(
      (offer) => offer.code?.toLowerCase() === trimmed.toLowerCase() && validateOffer(offer)
    );

    if (!matchingOffer) {
      setPromoError('Invalid or expired promo code.');
      setAppliedOffer(null);
      return;
    }

    setAppliedOffer(matchingOffer);
    setPromoError('');
  };

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
    <div className="h-full min-h-0 bg-transparent text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-sky-300">Secure checkout</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Pay for your booking</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-400">
                Complete your payment securely with PayHere sandbox. Your card details are encrypted and handled safely.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-3 text-sm text-slate-200 ring-1 ring-white/10">
              <Lock className="h-4 w-4 text-emerald-400" />
              Sandbox mode enabled
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.7fr_0.95fr]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/90 shadow-[0_35px_80px_-30px_rgba(15,23,42,0.8)]">
              <div className="bg-gradient-to-r from-sky-600 via-cyan-500 to-slate-950/0 px-6 py-7 sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-200/70">Payment method</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Card checkout</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 ring-1 ring-white/10">
                    <CreditCard className="h-4 w-4" />
                    Pay with card
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-200">
                  <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-2 ring-1 ring-white/10">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1F71] text-[10px] font-bold uppercase text-white">V</span>
                    Visa
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-2 ring-1 ring-white/10">
                    <span className="relative flex h-6 w-6 items-center justify-center">
                      <span className="absolute left-0 h-4 w-4 rounded-full bg-[#EB001B]" />
                      <span className="absolute right-0 h-4 w-4 rounded-full bg-[#F79E1B]" />
                    </span>
                    Mastercard
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-2 ring-1 ring-white/10">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2D9CDB] text-[10px] font-bold uppercase text-white">AM</span>
                    Amex
                  </div>
                </div>
              </div>

              <div className="px-6 py-8 sm:px-8 sm:py-10">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="cardholderName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-300">Cardholder name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Doe"
                                className="h-12 rounded-2xl border border-white/10 bg-slate-800 px-4 text-sm text-white shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cardNumber"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-sm font-semibold text-slate-300">Card number</FormLabel>
                            <FormControl>
                              <Input
                                className="h-12 rounded-2xl border border-white/10 bg-slate-800 px-4 text-sm font-mono tracking-[0.25em] text-white shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                                placeholder="1234 5678 9012 3456"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="expiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-300">Expiry</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="MM/YY"
                                maxLength={5}
                                className="h-12 rounded-2xl border border-white/10 bg-slate-800 px-4 text-sm font-mono text-white shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
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
                            <FormLabel className="text-sm font-semibold text-slate-300">CVC</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="123"
                                maxLength={4}
                                className="h-12 rounded-2xl border border-white/10 bg-slate-800 px-4 text-sm font-mono text-white shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end">
                        <div className="rounded-3xl border border-white/10 bg-slate-900 p-4 text-xs leading-5 text-slate-300 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.7)]">
                          <p className="font-semibold text-white">Security</p>
                          <p className="mt-2">Your card details are encrypted and processed securely.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">Promo code</p>
                          <p className="text-xs text-slate-400">Paste an offer code to apply a discount.</p>
                        </div>
                        {appliedOffer ? (
                          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                            <Check className="h-3.5 w-3.5" /> Applied
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <Input
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="Enter promo code"
                          className="h-12 rounded-2xl border border-white/10 bg-slate-800 px-4 text-sm text-white shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl px-6 text-sm font-semibold"
                          onClick={applyPromoCode}
                        >
                          Apply
                        </Button>
                      </div>
                      {promoError ? <p className="text-sm text-rose-300">{promoError}</p> : null}
                      {appliedOffer ? (
                        <div className="rounded-2xl bg-slate-950/80 p-3 text-sm text-slate-300">
                          <p className="font-semibold text-white">{appliedOffer.title || 'Promo code applied'}</p>
                          <p>{appliedOffer.description || `Saved LKR ${discountAmount.toLocaleString()}`}</p>
                        </div>
                      ) : null}
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-3xl bg-sky-500 px-6 py-4 text-base font-semibold text-white shadow-2xl shadow-sky-500/20 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Processing payment...
                        </span>
                      ) : (
                        <>Pay LKR {discountedTotal.toLocaleString()}</>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>

            <div className="rounded-[2rem] bg-slate-900/80 px-6 py-6 shadow-sm ring-1 ring-white/10 sm:px-8">
              <h3 className="text-lg font-semibold text-white">Need help?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                If you have trouble completing the payment, contact support or try again with a different card.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-2 text-sm text-slate-300">
                  <CheckCircle className="h-4 w-4 text-emerald-400" /> 100% secure checkout
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-2 text-sm text-slate-300">
                  <Shield className="h-4 w-4 text-blue-400" /> PayHere sandbox mode
                </span>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-[0_35px_80px_-30px_rgba(15,23,42,0.8)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">Order summary</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Booking details</h2>
                </div>
                <div className="rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-200">
                  LKR {discountedTotal.toLocaleString()}
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm text-slate-300">
                {appliedOffer ? (
                  <div className="grid gap-3 rounded-[1.75rem] bg-slate-900/80 p-4">
                    <span className="text-slate-400">Discount</span>
                    <div className="flex items-center justify-between gap-2 text-white">
                      <span>{appliedOffer.title || 'Promo code applied'}</span>
                      <span>-LKR {discountAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-3 rounded-[1.75rem] bg-slate-900/80 p-4">
                  <span className="text-slate-400">Route</span>
                  <span className="font-semibold text-white">{bookingData.routeName}</span>
                </div>
                <div className="grid gap-3 rounded-[1.75rem] bg-slate-900/80 p-4">
                  <span className="text-slate-400">Date</span>
                  <span className="font-semibold text-white">{new Date(bookingData.date).toLocaleDateString('en-LK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="grid gap-3 rounded-[1.75rem] bg-slate-900/80 p-4">
                  <span className="text-slate-400">Seats</span>
                  <span className="font-semibold text-white">#{bookingData.seatNumbers}</span>
                </div>
                <div className="grid gap-3 rounded-[1.75rem] bg-slate-900/80 p-4">
                  <span className="text-slate-400">Passenger</span>
                  <span className="font-semibold text-white">{bookingData.passengerName}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.7)]">
              <h3 className="text-lg font-semibold text-white">Secure payment</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                This transaction is protected by the PayHere sandbox gateway. No payment information is stored on our servers.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-800 px-4 py-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Lock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">Encrypted card data</p>
                    <p className="text-sm text-slate-300">Your card details are transmitted over HTTPS.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-800 px-4 py-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">Fraud detection</p>
                    <p className="text-sm text-slate-300">We monitor every payment for suspicious activity.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-300">
            <span className="font-medium text-white">Need to change details?</span> Use the back button to update your booking information.
          </div>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            disabled={loading}
          >
            Back to booking
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
