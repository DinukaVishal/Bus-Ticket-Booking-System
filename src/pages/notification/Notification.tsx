import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { sendBookingEmail, type EmailData } from '@/lib/emailService';
import Header from '@/components/layout/Header';

type LocationState = {
  bookingDetails?: {
    ticket_id?: string;
    seat_no?: string;
    route?: string;
    travel_date?: string;
    payment_amount?: string;
    to_name?: string;
  };
};

const formatDate = (d?: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const Notification = () => {
  const location = useLocation();
  const { bookingDetails } = (location.state as LocationState) || {};

  // Logged-in user (email from auth user; fallback if needed)
  const { user } = useAuthContext();

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipientEmail = useMemo(() => {
    // Requirements: send to profile/email. We use auth user's email as the source.
    // If email is missing, UI will handle gracefully.
    return user?.email || '';
  }, [user?.email]);

  const recipientName = useMemo(() => {
    // Template expects to_name; use best available value.
    const nameFromUser = (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.display_name;
    return bookingDetails?.to_name || nameFromUser || 'Passenger';
  }, [bookingDetails?.to_name, user?.user_metadata]);

  const emailPayload: EmailData | null = useMemo(() => {
    if (!bookingDetails) return null;

    const ticket_id = bookingDetails.ticket_id ?? '';
    const seat_no = bookingDetails.seat_no ?? '';
    const route = bookingDetails.route ?? '';
    const travel_date = formatDate(bookingDetails.travel_date) || '';
    const payment_amount = bookingDetails.payment_amount ?? '';

    return {
      to_name: recipientName,
      to_email: recipientEmail,
      ticket_id,
      seat_no,
      route,
      travel_date,
      payment_amount,
    };
  }, [bookingDetails, recipientEmail, recipientName]);

  const onSend = async () => {
    setSending(true);
    setSent(false);
    setError(null);

    try {
      console.log('bookingDetails:', bookingDetails);
      console.log('recipient email:', recipientEmail);

      if (!emailPayload) {
        setError('Booking details are missing. Please go back to your bookings and try again.');
        return;
      }
      if (!emailPayload.to_email) {
        setError('No recipient email found in your logged-in profile.');
        return;
      }

      const ok = await sendBookingEmail(emailPayload);
      console.log('EmailJS send result:', ok);

      if (!ok) {
        setError('Failed to send email. Please try again.');
        return;
      }

      setSent(true);
    } catch (e: any) {
      console.error('Email error:', e);
      setError(e?.message || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  const canSend = Boolean(emailPayload?.to_email) && Boolean(bookingDetails);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 md:py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Notification</h1>
          <p className="text-muted-foreground mt-1">Send your ticket booking details to your email.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card className="border-2 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Booking Details
              </CardTitle>
              <CardDescription>Review details before sending.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!bookingDetails ? (
                <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium">No booking details found.</p>
                    <p className="text-sm text-muted-foreground">Please navigate from your booking confirmation page.</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm space-y-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Ticket ID</span>
                    <span className="font-medium text-foreground">{bookingDetails.ticket_id}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Seat Number</span>
                    <span className="font-medium text-foreground">{bookingDetails.seat_no}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Route</span>
                    <span className="font-medium text-foreground">{bookingDetails.route}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Travel Date</span>
                    <span className="font-medium text-foreground">{formatDate(bookingDetails.travel_date)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Payment Amount</span>
                    <span className="font-medium text-foreground">{bookingDetails.payment_amount}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Error</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
              )}

              {sent && (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-500">Email sent successfully!</p>
                    <p className="text-sm text-muted-foreground">Check your inbox for booking confirmation.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle>Send Ticket Email</CardTitle>
              <CardDescription>Uses EmailJS to send the email to your logged-in email address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={onSend}
                disabled={!canSend || sending}
                className="w-full h-12 rounded-xl"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {sending ? 'Sending...' : 'Send Ticket Email'}
              </Button>

              <div className="text-xs text-muted-foreground leading-relaxed">
                <p>
                  Recipient: <span className="font-medium text-foreground">{recipientEmail || 'Not available'}</span>
                </p>
                <p className="mt-2">
                  If details are missing, go back to your booking confirmation page and try again.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Notification;

