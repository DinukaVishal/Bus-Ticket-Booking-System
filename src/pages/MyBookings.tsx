import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useMyBookings, useUpdateBookingStatus } from '@/hooks/useBookings';
import { useRoutes } from '@/hooks/useRoutes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Ticket, Loader2, Calendar, Armchair, XCircle, Download, User, Trash2, Radio } from 'lucide-react';
import { generateTicketPDF } from '@/lib/pdfTicketGenerator';
import { Booking } from '@/types/booking';
import { supabase } from '@/integrations/supabase/client';

const MyBookings = () => {
  const { data: bookings = [], isLoading, refetch } = useMyBookings();
  const { data: routes = [] } = useRoutes();
  const { user } = useAuth();
  const updateStatusMutation = useUpdateBookingStatus();
  const [cancellingGroupKey, setCancellingGroupKey] = useState<string | null>(null);
  const navigate = useNavigate();

  // If not authenticated, show message
  if (!user && !isLoading) {
    return (
      <div className="min-h-screen page-shell page-bg bg-fixed booking-blur text-foreground">
        <Header />
        <div className="absolute inset-0 pointer-events-none bg-black/10 backdrop-blur-lg" />
        <main className="relative z-10 container mx-auto px-4 py-10">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-12 shadow-2xl text-center">
            <h3 className="text-2xl font-display font-semibold text-white mb-4">Please sign in to view your bookings</h3>
            <p className="text-slate-400 mb-6">Access your booking history, download tickets, and manage upcoming trips when you are signed in.</p>
            <Button onClick={() => window.location.href = '/login'} className="bg-sky-500 text-white hover:bg-sky-400">
              Sign In
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen page-shell page-bg bg-fixed booking-blur text-foreground">
        <Header />
        <div className="absolute inset-0 pointer-events-none bg-black/10 backdrop-blur-lg" />
        <main className="relative z-10 container mx-auto px-4 py-10">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
          </div>
        </main>
      </div>
    );
  }

  const groupedBookings = bookings.reduce((groups: any, booking: Booking) => {
    const identifier = booking.tripId || booking.routeId || booking.routeName;
    const key = `${identifier}-${booking.date}-${booking.status}`;

    if (!groups[key]) {
      groups[key] = {
        ...booking,
        seatNumbers: [booking.seatNumber],
        bookingIds: [booking.id],
        allBookings: [booking],
      };
    } else {
      groups[key].seatNumbers.push(booking.seatNumber);
      groups[key].bookingIds.push(booking.id);
      groups[key].allBookings.push(booking);
    }
    return groups;
  }, {});

  const bookingGroups = Object.values(groupedBookings) as any[];

  const handleDownloadTicket = (group: any) => {
    const route = routes.find(r => r.id === group.routeId) || routes.find(r => r.name === group.routeName);
    const trip = route?.trips.find((t) => t.id === group.tripId);
    if (route && trip) {
      const ticketData = group.allBookings.map((b: Booking) => ({ booking: b, route, trip }));
      generateTicketPDF(ticketData);
    } else if (route) {
      const ticketData = group.allBookings.map((b: Booking) => ({ booking: b, route, trip: route.trips[0] || { id: '', departureTime: '', price: 0 } }));
      generateTicketPDF(ticketData);
    } else {
      toast({
        title: 'Error',
        description: 'Could not find route details for this booking.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelGroup = async (groupKey: string, bookingIds: string[]) => {
    setCancellingGroupKey(groupKey);
    try {
      await Promise.all(bookingIds.map(id =>
        updateStatusMutation.mutateAsync({ bookingId: id, status: 'cancelled' })
      ));

      toast({
        title: 'Booking Cancelled',
        description: 'Your bookings have been cancelled successfully.',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel booking.',
        variant: 'destructive',
      });
    } finally {
      setCancellingGroupKey(null);
    }
  };

  const handleDeleteHistory = async (bookingIds: string[]) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .in('booking_id', bookingIds);

      if (error) throw error;
      
      toast({ title: 'Deleted', description: 'Booking history removed.' });
      refetch();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
    }
  };

  const upcomingGroups = bookingGroups.filter(
    (g) => g.status === 'confirmed' && new Date(g.date) >= new Date(new Date().toDateString())
  );

  const pastGroups = bookingGroups.filter(
    (g) => g.status !== 'confirmed' || new Date(g.date) < new Date(new Date().toDateString())
  );

  return (
    <div className="min-h-screen page-shell page-bg bg-fixed booking-blur text-foreground">
      <Header />
      <div className="absolute inset-0 pointer-events-none bg-black/10 backdrop-blur-lg" />

      <main className="relative z-10 container mx-auto px-4 py-10">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-4 py-2 text-sm text-sky-200 mb-3">
                <Ticket className="w-4 h-4" />
                Your booking dashboard
              </div>
              <h1 className="text-white text-3xl md:text-4xl font-display font-bold">My Bookings</h1>
              <p className="mt-3 text-slate-300 leading-7">
                View confirmed trips, download tickets, and manage your upcoming journeys from one place.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Upcoming</p>
                <p className="mt-3 text-3xl font-semibold text-white">{upcomingGroups.length}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Past / Cancelled</p>
                <p className="mt-3 text-3xl font-semibold text-white">{pastGroups.length}</p>
              </div>
            </div>
          </div>
        </div>

        {bookingGroups.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-12 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5">
              <Ticket className="w-10 h-10 text-sky-300" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">No bookings found</h3>
            <p className="text-slate-400 max-w-lg mx-auto mb-6">
              You don't have any bookings yet. Start your journey by reserving a ticket now.
            </p>
            <Button onClick={() => window.location.href = '/'} className="bg-sky-500 text-white hover:bg-sky-400">
              Book a Ticket
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {upcomingGroups.length > 0 && (
              <section>
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-2xl font-display font-semibold">Upcoming trips</h2>
                    <p className="text-slate-400 mt-1">Manage upcoming travel plans and download your tickets.</p>
                  </div>
                  <Badge variant="secondary">{upcomingGroups.length} active</Badge>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  {upcomingGroups.map((group, index) => {
                    const identifier = group.tripId || group.routeId || group.routeName;
                    const groupKey = `${identifier}-${group.date}-${group.status}`;
                    return (
                      <div key={index} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Upcoming</Badge>
                              <span className="text-sm text-slate-400">{group.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white">{group.routeName}</h3>
                            <p className="text-sm text-slate-400">Booking IDs: {group.bookingIds.join(', ')}</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-300">
                              <div className="flex items-center gap-2 text-slate-400 mb-2"><Calendar className="w-4 h-4" /> Date</div>
                              <p>{new Date(group.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-300">
                              <div className="flex items-center gap-2 text-slate-400 mb-2"><Armchair className="w-4 h-4" /> Seats</div>
                              <p>{group.seatNumbers.sort((a:number, b:number) => a - b).map((s:number) => `#${s}`).join(', ')}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate(`/tracking/${group.routeId}/${group.bookingIds[0]}`)}
                          >
                            <Radio className="w-4 h-4 mr-2" />
                            Live Track
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full bg-sky-500 text-white hover:bg-sky-400"
                            onClick={() => handleDownloadTicket(group)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Ticket
                          </Button>
                        </div>

                        <div className="mt-4">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-destructive text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Booking
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel seats <strong>{group.seatNumbers.join(', ')}</strong> for this trip? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelGroup(groupKey, group.bookingIds)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {cancellingGroupKey === groupKey ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Cancelling...
                                    </>
                                  ) : (
                                    'Yes, Cancel'
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {pastGroups.length > 0 && (
              <section>
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-2xl font-display font-semibold">Past & cancelled trips</h2>
                    <p className="text-slate-400 mt-1">Review completed journeys or remove old records from history.</p>
                  </div>
                  <Badge variant="secondary">{pastGroups.length} records</Badge>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  {pastGroups.map((group, index) => (
                    <div key={index} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{group.routeName}</h3>
                          <p className="text-sm text-slate-400 mt-1">Booking IDs: {group.bookingIds.join(', ')}</p>
                        </div>
                        <Badge variant={group.status === 'cancelled' ? 'destructive' : 'secondary'}>
                          {group.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                        </Badge>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3 text-sm text-slate-300">
                        <div className="rounded-3xl bg-slate-950/80 p-4">
                          <div className="text-slate-400 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Date</div>
                          <p>{new Date(group.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-950/80 p-4">
                          <div className="text-slate-400 mb-2 flex items-center gap-2"><Armchair className="w-4 h-4" /> Seats</div>
                          <p>{group.seatNumbers.sort((a:number, b:number) => a - b).map((s:number) => `#${s}`).join(', ')}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-950/80 p-4">
                          <div className="text-slate-400 mb-2 flex items-center gap-2"><User className="w-4 h-4" /> Passenger</div>
                          <p>{group.passengerName}</p>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full bg-sky-500 text-white hover:bg-sky-400"
                          onClick={() => handleDownloadTicket(group)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Ticket
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleDeleteHistory(group.bookingIds)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove from history
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyBookings;
