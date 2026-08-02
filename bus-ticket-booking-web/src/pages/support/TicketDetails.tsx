import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import {
  StatusBadge,
  PriorityBadge,
  MessageThread,
  ReplyBox,
  TicketTimeline,
  InternalNotes,
  TicketActions,
  TicketRatingDialog,
  TicketDetailSkeleton,
} from '@/components/support';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  useTicket,
  useTicketMessages,
  useTicketNotes,
  useTicketEvents,
  useTicketRating,
  useUpdateTicketStatus,
} from '@/hooks/useSupport';
import { useAuthContext } from '@/contexts/AuthContext';
import { CATEGORY_EMOJI, formatDateTime } from '@/lib/support/constants';
import {
  ArrowLeft,
  Lock,
  Star,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Clock,
  LifeBuoy,
} from 'lucide-react';

const TicketDetails = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const { data: ticket, isLoading, error } = useTicket(ticketId);
  const { data: messages = [] } = useTicketMessages(ticketId);
  const { data: notes = [] } = useTicketNotes(ticketId);
  const { data: events = [] } = useTicketEvents(ticketId);
  const { data: rating } = useTicketRating(ticketId);
  const updateStatus = useUpdateTicketStatus();

  const [ratingOpen, setRatingOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen page-shell page-bg">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <TicketDetailSkeleton />
        </main>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen page-shell page-bg">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card/70 p-8 text-center">
            <LifeBuoy className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h2 className="mt-4 font-display text-lg font-bold text-foreground">Ticket not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Either this ticket does not exist or you do not have permission to view it.
            </p>
            <Button className="mt-6 rounded-full" onClick={() => navigate('/support/my-tickets')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Tickets
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isOwner = ticket.user_id === user?.id;
  const isStaffViewer = !!ticket.assigned_staff_id || true; // staff/admins can always manage from their views

  const canReply =
    isOwner ||
    ticket.assigned_staff_id === user?.id ||
    ticket.status !== 'Closed';

  const canClose = isOwner && ['Resolved', 'Open'].includes(ticket.status);
  const canRate = isOwner && (ticket.status === 'Resolved' || ticket.status === 'Closed') && !rating;
  const canManage = isStaffViewer; // staff or admin can change status/priority

  const handleClose = async () => {
    try {
      await updateStatus.mutateAsync({ ticketId: ticket.id, status: 'Closed' });
      toast({ title: 'Ticket closed', description: 'Thanks for using QuickBus support.' });
    } catch (e: any) {
      toast({ title: 'Failed to close ticket', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2 rounded-full text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {/* Ticket header card */}
        <div className="rounded-2xl border border-border/60 bg-card/70 p-5 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-primary">{ticket.ticket_number}</span>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <Badge variant="outline" className="gap-1 bg-muted/40">
                  {CATEGORY_EMOJI[ticket.category] || '📋'} {ticket.category}
                </Badge>
              </div>
              <h1 className="mt-3 font-display text-xl md:text-2xl font-bold text-foreground">{ticket.subject}</h1>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> {formatDateTime(ticket.created_at)}
                </span>
                {ticket.resolved_at && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Resolved {formatDateTime(ticket.resolved_at)}
                  </span>
                )}
                {ticket.closed_at && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> Closed {formatDateTime(ticket.closed_at)}
                  </span>
                )}
                {ticket.profiles?.display_name && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4" /> {ticket.profiles.display_name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {canClose && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 rounded-full text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> Close Ticket
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the ticket as closed. You won't be able to reply afterwards, but you can still rate your support experience.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClose} className="bg-emerald-600 text-white hover:bg-emerald-700">
                        Close Ticket
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {canRate && (
                <Button className="gap-2 rounded-full" onClick={() => setRatingOpen(true)}>
                  <Star className="h-4 w-4" /> Rate Support
                </Button>
              )}

              {rating && (
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-amber-600 bg-amber-50">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  Rated {rating.rating}/5
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mt-5 rounded-xl border border-border/60 bg-background/50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{ticket.description}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversation */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                <LifeBuoy className="h-4 w-4 text-primary" /> Conversation
              </h2>
              <div ref={bottomRef} className="max-h-[45rem] space-y-4 overflow-y-auto pr-1" style={{ scrollBehavior: 'smooth' }}>
                <MessageThread messages={messages} />
              </div>
            </div>

            {canReply ? (
              <ReplyBox ticketId={ticket.id} disabled={ticket.status === 'Closed'} />
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
                Replies are closed for this ticket.
              </div>
            )}

            {isStaffViewer && (
              <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary" /> Timeline
                </h2>
                <TicketTimeline events={events} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {canManage && <TicketActions ticket={ticket} />}

            {isOwner && (
              <div className="rounded-2xl border border-border/60 bg-card/70 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ticket Number</span>
                  <span className="font-mono font-semibold text-primary">{ticket.ticket_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assigned Staff</span>
                  <span className="font-medium text-foreground">{ticket.assigned_staff?.display_name || 'Not assigned yet'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium text-foreground">{formatDateTime(ticket.updated_at)}</span>
                </div>
              </div>
            )}

            {isStaffViewer && !isOwner && (
              <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5 p-4">
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Staff view</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Customer replies are sent here. Use the management panel on the left to change status, priority, or assignment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isStaffViewer && <InternalNotes ticketId={ticket.id} notes={notes} />}
          </div>
        </div>

        <TicketRatingDialog
          ticketId={ticket.id}
          open={ratingOpen}
          onOpenChange={setRatingOpen}
          existingRating={rating}
        />
      </main>
    </div>
  );
};

export default TicketDetails;

