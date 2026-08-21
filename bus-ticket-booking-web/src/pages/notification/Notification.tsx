import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  Bell,
  BellRing,
  Mail,
  Inbox,
  ArrowLeft,
  ExternalLink,
  CheckCheck,
  Clock,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { sendBookingEmail, type EmailData } from '@/lib/emailService';
import Header from '@/components/layout/Header';
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useSupport';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types/support';

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

const formatTimestamp = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/** Fallback title/message per requirements. */
const safeTitle = (n: Notification): string => (n.title && n.title.trim()) ? n.title : 'Notification';
const safeMessage = (n: Notification): string => (n.message && n.message.trim()) ? n.message : 'No details available.';

const TYPE_META: Record<string, { label: string; className: string; icon: string }> = {
  booking: { label: 'Booking', className: 'bg-sky-50 text-sky-700 border-sky-200', icon: '🎫' },
  payment: { label: 'Payment', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '💳' },
  support: { label: 'Support', className: 'bg-violet-50 text-violet-700 border-violet-200', icon: '🎧' },
  refund: { label: 'Refund', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: '💸' },
  system: { label: 'System', className: 'bg-slate-100 text-slate-700 border-slate-200', icon: '⚙️' },
  info: { label: 'Info', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'ℹ️' },
};

const getTypeMeta = (type?: string | null) => {
  const key = (type || 'info').toLowerCase();
  return TYPE_META[key] || TYPE_META.info;
};

const NotificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookingDetails } = (location.state as LocationState) || {};

  const { user } = useAuthContext();

  // Notification center data
  const { data: notifications = [], isLoading: notificationsLoading, isError: notificationsError } = useNotifications();
  const { data: unread = 0 } = useUnreadCount();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  // Email tab state (preserved existing functionality)
  const [activeTab, setActiveTab] = useState<'notifications' | 'email'>('notifications');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded notification details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const recipientEmail = useMemo(() => user?.email || '', [user?.email]);

  const recipientName = useMemo(() => {
    const nameFromUser = (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.display_name;
    return bookingDetails?.to_name || nameFromUser || 'Passenger';
  }, [bookingDetails?.to_name, user?.user_metadata]);

  const emailPayload: EmailData | null = useMemo(() => {
    if (!bookingDetails) return null;
    return {
      to_name: recipientName,
      to_email: recipientEmail,
      ticket_id: bookingDetails.ticket_id ?? '',
      seat_no: bookingDetails.seat_no ?? '',
      route: bookingDetails.route ?? '',
      travel_date: formatDate(bookingDetails.travel_date) || '',
      payment_amount: bookingDetails.payment_amount ?? '',
    };
  }, [bookingDetails, recipientEmail, recipientName]);

  const onSend = async () => {
    setSending(true);
    setSent(false);
    setError(null);
    try {
      if (!emailPayload) {
        setError('Booking details are missing. Please go back to your bookings and try again.');
        return;
      }
      if (!emailPayload.to_email) {
        setError('No recipient email found in your logged-in profile.');
        return;
      }
      const ok = await sendBookingEmail(emailPayload);
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

  /** Handle clicking a notification: mark read + expand + navigate if link. */
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }

    // If there's a valid link, navigate to the related page
    if (notification.link) {
      navigate(notification.link);
      return;
    }

    // Otherwise toggle the expanded details view
    setExpandedId((prev) => (prev === notification.id ? null : notification.id));
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 md:py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span className="text-sm">Notification Center</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Stay up to date with your bookings, payments, and support tickets.
            </p>
          </div>

          {/* Tab toggle: preserve email functionality */}
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <Button
              variant={activeTab === 'notifications' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full gap-2"
              onClick={() => setActiveTab('notifications')}
            >
              <BellRing className="h-4 w-4" />
              Notifications
              {unread > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-[10px] font-bold text-primary-foreground">
                  {unread}
                </span>
              )}
            </Button>
            <Button
              variant={activeTab === 'email' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full gap-2"
              onClick={() => setActiveTab('email')}
            >
              <Mail className="h-4 w-4" />
              Send Ticket Email
            </Button>
          </div>
        </div>

        {activeTab === 'notifications' ? (
          <div className="grid grid-cols-1 gap-6">
            <Card className="border-2 rounded-2xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-primary" />
                    Your Notifications
                  </CardTitle>
                  <CardDescription>
                    {unread > 0
                      ? `You have ${unread} unread notification${unread !== 1 ? 's' : ''}.`
                      : 'You are all caught up.'}
                  </CardDescription>
                </div>
                {unread > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                  >
                    <CheckCheck className="h-4 w-4" />
                    {markAllReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
                  </Button>
                )}
              </CardHeader>

              <CardContent>
                {notificationsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : notificationsError ? (
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Failed to load notifications</p>
                      <p className="text-sm text-muted-foreground">Please refresh the page to try again.</p>
                    </div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                      <Bell className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="font-medium text-foreground">No notifications yet</p>
                    <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                      When you book a ticket, make a payment, or interact with support, updates will show up here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => {
                      const meta = getTypeMeta(notification.type);
                      const isExpanded = expandedId === notification.id;
                      const isUnread = !notification.read;
                      return (
                        <div
                          key={notification.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotificationClick(notification)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleNotificationClick(notification);
                            }
}}
                          className={cn(
                            'group w-full cursor-pointer rounded-xl border p-4 text-left transition-all',
                            isUnread
                              ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                              : 'border-border/60 bg-background/40 hover:bg-muted/40',
                            isExpanded && 'ring-2 ring-primary/30',
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 rounded-xl shrink-0 bg-muted">
                              <AvatarFallback className="rounded-xl bg-muted text-base">
                                {meta.icon}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {isUnread && (
                                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary" title="Unread" />
                                  )}
                                  <p
                                    className={cn(
                                      'truncate text-sm font-semibold text-foreground',
                                      isUnread ? '' : 'text-muted-foreground',
                                    )}
                                  >
                                    {safeTitle(notification)}
                                  </p>
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground" title={notification.created_at || ''}>
                                  {formatTimestamp(notification.created_at)}
                                </span>
                              </div>

                              {/* Preview (line-clamped when collapsed) */}
                              <p
                                className={cn(
                                  'mt-1 text-sm text-muted-foreground',
                                  isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2',
                                )}
                              >
                                {safeMessage(notification)}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={cn('text-[10px] px-2 py-0 border', meta.className)}>
                                  {meta.label}
                                </Badge>
                                {notification.entity_type && (
                                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                                    {notification.entity_type}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    'text-[10px] font-medium uppercase tracking-wide',
                                    isUnread ? 'text-primary' : 'text-muted-foreground/60',
                                  )}
                                >
                                  {isUnread ? 'Unread' : 'Read'}
                                </span>
                                {notification.link && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary/80">
                                    <ExternalLink className="h-3 w-3" />
                                    View details
                                  </span>
                                )}
                              </div>

                              {/* Expanded full message */}
                              {isExpanded && (
                                <div className="mt-3 rounded-lg border border-border/60 bg-background/60 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                                    Full message
                                  </p>
                                  <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                                    {safeMessage(notification)}
                                  </p>
                                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {notification.created_at
                                        ? new Date(notification.created_at).toLocaleString('en-US', {
                                            weekday: 'short',
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                          })
                                        : 'Unknown time'}
                                    </span>
                                    {notification.entity_id && (
                                      <span className="truncate font-mono text-[10px]">
                                        Ref: {notification.entity_id}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ---------- Preserved: Send Ticket Email tab ---------- */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <Card className="border-2 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Booking Details
                </CardTitle>
                <CardDescription>Review details before sending.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">How to use:</p>
                    <p className="text-muted-foreground">
                      Navigate from your <strong>Booking Confirmation</strong> page to auto-fill these details. If they are
                      missing, go back to your bookings and use the “Send Ticket Email” button there.
                    </p>
                  </div>
                </div>

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
                    Recipient:{' '}
                    <span className="font-medium text-foreground">{recipientEmail || 'Not available'}</span>
                  </p>
                  <p className="mt-2">
                    If details are missing, go back to your booking confirmation page and try again.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  onClick={() => navigate('/my-bookings')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go to My Bookings
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationPage;

