import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { SupportLayout, AttachmentButton } from '@/components/support';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories, useCreateTicket } from '@/hooks/useSupport';
import { toast } from '@/hooks/use-toast';
import { TICKET_PRIORITIES } from '@/lib/support/constants';
import type { TicketPriority } from '@/types/support';
import { CATEGORY_EMOJI } from '@/lib/support/constants';
import { fetchBookingById } from '@/lib/support/supportApi';
import { Loader2, Send, Sparkles, Calendar, MapPin, Armchair, User, X } from 'lucide-react';

const CreateTicket = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId') || '';
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const createTicket = useCreateTicket();

  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [linkedBooking, setLinkedBooking] = useState<any | null>(null);
  const [bookingLoading, setBookingLoading] = useState(!!bookingIdParam);

  // Auto pre-fill booking information when arriving via ?bookingId=
  useEffect(() => {
    if (!bookingIdParam) return;
    let active = true;
    setBookingLoading(true);
    fetchBookingById(bookingIdParam)
      .then((booking) => {
        if (!active) return;
        setLinkedBooking(booking);
        if (booking) {
          setCategory((c) => c || 'Booking Issue');
          setSubject(
            (s) =>
              s ||
              `Issue with booking ${booking.booking_id || bookingIdParam}`
          );
          setDescription(
            (d) =>
              d ||
              [
                booking.route_name ? `Route: ${booking.route_name}` : '',
                booking.date ? `Travel date: ${booking.date}` : '',
                booking.seat_number ? `Seat: ${booking.seat_number}` : '',
                booking.passenger_name ? `Passenger: ${booking.passenger_name}` : '',
              ]
                .filter(Boolean)
                .join('\n')
          );
        }
      })
      .catch(() => {
        if (!active) return;
        toast({
          title: 'Booking not found',
          description: 'Could not load the related booking. You can still create a ticket.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (active) setBookingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingIdParam]);

  const canSubmit = category && subject.trim() && description.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const created = await createTicket.mutateAsync({
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        bookingId: bookingIdParam || linkedBooking?.booking_id || null,
      });
      toast({
        title: 'Ticket created',
        description: `Your ticket ${created.ticket_number} was created successfully.`,
      });
      navigate(`/support/${created.id}`);
    } catch (error: any) {
      toast({
        title: 'Failed to create ticket',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SupportLayout title="Create a Support Ticket" description="Describe your issue and our team will help you.">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/70 p-6 space-y-5">
              {/* Related booking banner */}
              {bookingIdParam && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  {bookingLoading ? (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading related booking…
                    </div>
                  ) : linkedBooking ? (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <User className="h-4 w-4 text-primary" /> Related booking #{linkedBooking.booking_id}
                        </p>
                        {linkedBooking.route_name && (
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" /> {linkedBooking.route_name}
                          </p>
                        )}
                        {linkedBooking.date && (
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" /> {linkedBooking.date}
                          </p>
                        )}
                        {linkedBooking.seat_number != null && (
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <Armchair className="h-3.5 w-3.5" /> Seat #{linkedBooking.seat_number}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinkedBooking(null)}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Remove related booking"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Related booking not found. You can still create a ticket and mention it in the description.
                    </p>
                  )}
                </div>
              )}

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                {categoriesLoading ? (
                  <Skeleton className="h-10 w-full rounded-md" />
                ) : (
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          <span className="inline-flex items-center gap-2">
                            <span>{CATEGORY_EMOJI[c.name] || '📋'}</span>
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!categoriesLoading && categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">No categories available yet.</p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              p === 'Low' ? 'bg-slate-400' : p === 'Medium' ? 'bg-blue-500' : p === 'High' ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                          />
                          {p}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Use <strong>Critical</strong> for urgent issues like payment failures or safety concerns.
                </p>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  maxLength={120}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide as much detail as possible: booking ID, route, date, what happened..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Attachments */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/80 p-3">
                <AttachmentButton file={attachment} onSelect={setAttachment} />
                <span className="text-xs text-muted-foreground">
                  Optional. Images or PDF, max 5 MB. Uploaded after the ticket is created.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => navigate(-1)} className="rounded-full">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!canSubmit || createTicket.isPending} className="gap-2 rounded-full">
                  {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Ticket
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Tips for a fast resolution</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span>📌</span> Include your booking/payment reference.</li>
                  <li className="flex gap-2"><span>📅</span> Mention relevant dates and routes.</li>
                  <li className="flex gap-2"><span>📸</span> Attach screenshots if possible.</li>
                  <li className="flex gap-2"><span>⚡</span> Higher priorities get handled sooner.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-blue-200/60 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/5 p-5 text-sm text-muted-foreground">
                {category ? (
                  <>
                    You're about to create a <strong className="text-foreground">{category}</strong> ticket with{' '}
                    <strong className="text-foreground">{priority}</strong> priority.
                  </>
                ) : (
                  <>Select a category to get started.</>
                )}
              </div>
            </div>
          </div>
        </SupportLayout>
      </main>
    </div>
  );
};

export default CreateTicket;

