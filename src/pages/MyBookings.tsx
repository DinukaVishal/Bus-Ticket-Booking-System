import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Ticket, Loader2, Calendar, MapPin, Armchair, XCircle, Download, User, Trash2 } from 'lucide-react';
import { generateTicketPDF } from '@/lib/pdfTicketGenerator';
import { Booking } from '@/types/booking';
import QRCode from "react-qr-code";
import { supabase } from '@/integrations/supabase/client';

const QRCodeComponent = (QRCode as any)?.default ?? QRCode;

const MyBookings = () => {
  const { data: bookings = [], isLoading, refetch } = useMyBookings();
  const { data: routes = [] } = useRoutes();
  const { user } = useAuth();
  const updateStatusMutation = useUpdateBookingStatus();
  const [cancellingGroupKey, setCancellingGroupKey] = useState<string | null>(null);

  // Debug logging
  console.log('MyBookings - user:', user?.id, 'bookings:', bookings.length, 'isLoading:', isLoading, 'routes:', routes.length);
  console.log('MyBookings - bookings data:', bookings);
  console.log('MyBookings - user object:', user);

  // If not authenticated, show message
  if (!user && !isLoading) {
    console.log('MyBookings - showing auth message');
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-card rounded-xl p-12 shadow-card text-center">
            <h3 className="text-lg font-display font-semibold text-foreground mb-2">
              Please sign in to view your bookings
            </h3>
            <Button onClick={() => window.location.href = '/login'} className="mt-4">
              Sign In
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    console.log('MyBookings - showing loading state');
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  // --- GROUPING LOGIC ---
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

  console.log('MyBookings - bookingGroups:', bookingGroups.length, bookingGroups);

  // ----------------------------------------------

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

  // Upcoming Trips
  const upcomingGroups = bookingGroups.filter(
    (g) => g.status === 'confirmed' && new Date(g.date) >= new Date(new Date().toDateString())
  );

  // Past & Cancelled Trips
  const pastGroups = bookingGroups.filter(
    (g) => g.status !== 'confirmed' || new Date(g.date) < new Date(new Date().toDateString())
  );

  console.log('MyBookings - upcomingGroups:', upcomingGroups.length, 'pastGroups:', pastGroups.length);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Ticket className="w-8 h-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-display font-bold">My Bookings</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : bookingGroups.length === 0 ? (
          <div className="bg-card rounded-xl p-12 shadow-card text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Ticket className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-display font-semibold text-foreground mb-2">
              No Bookings Yet
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              You haven't made any bookings yet. Start by booking your first bus ticket!
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Book a Ticket
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Bookings */}
            {upcomingGroups.length > 0 && (
              <section>
                <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Upcoming Trips ({upcomingGroups.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingGroups.map((group, index) => {
                    const identifier = group.tripId || group.routeId || group.routeName;
                    const groupKey = `${identifier}-${group.date}-${group.status}`;
                    return (
                      <div
                        key={index}
                        className="bg-card rounded-xl p-6 shadow-card border-l-4 border-primary relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{group.routeName}</h3>
                            <p className="text-xs text-muted-foreground mt-1 break-all">
                              IDs: {group.bookingIds.join(', ')}
                            </p>
                          </div>
                          
                          <div className="bg-white p-1.5 rounded-lg border border-gray-100 ml-2 shadow-sm shrink-0">
                            <QRCodeComponent 
                              size={64}
                              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                              value={`IDs: ${group.bookingIds.join(', ')} | Seats: ${group.seatNumbers.join(', ')}`}
                              viewBox={`0 0 256 256`}
                            />
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {new Date(group.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-start gap-2 text-sm">
                            <Armchair className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <span className="font-semibold text-primary">
                                Seats: {group.seatNumbers.sort((a:number, b:number) => a - b).map((s:number) => `#${s}`).join(', ')}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({group.seatNumbers.length} seats)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{group.passengerName}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDownloadTicket(group)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel bookings for seats: <b>{group.seatNumbers.join(', ')}</b>? 
                                  This action cannot be undone.
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
                                    'Yes, Cancel All'
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

            {/* Past & Cancelled Bookings */}
            {pastGroups.length > 0 && (
              <section>
                <h2 className="text-lg font-display font-semibold mb-4 text-muted-foreground">
                  Past & Cancelled Bookings ({pastGroups.length})
                </h2>
                <div className="bg-card rounded-xl shadow-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Booking IDs</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Seats</TableHead>
                          <TableHead>Status</TableHead>
                          {/* මෙන්න වෙනස: text-right අයින් කළා */}
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pastGroups.map((group, index) => (
                          <TableRow key={index} className="opacity-70">
                            <TableCell className="font-mono text-xs max-w-[150px] truncate" title={group.bookingIds.join(', ')}>
                              {group.bookingIds.join(', ')}
                            </TableCell>
                            <TableCell>{group.routeName}</TableCell>
                            <TableCell>
                              {new Date(group.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </TableCell>
                            <TableCell className="font-medium">
                              {group.seatNumbers.sort((a:number, b:number) => a - b).map((s:number) => `#${s}`).join(', ')}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={group.status === 'cancelled' ? 'destructive' : 'secondary'}
                              >
                                {group.status === 'confirmed' ? 'Completed' : 'Cancelled'}
                              </Badge>
                            </TableCell>
                            {/* මෙන්න වෙනස: text-right අයින් කළා */}
                            <TableCell>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-red-500 hover:bg-red-50" 
                                onClick={() => handleDeleteHistory(group.bookingIds)}
                                title="Remove from history"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </section>
            )}

            {bookingGroups.length > 0 && upcomingGroups.length === 0 && pastGroups.length === 0 && (
              <section>
                <h2 className="text-lg font-display font-semibold mb-4">
                  Your Bookings ({bookingGroups.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {bookingGroups.map((group, index) => {
                    const identifier = group.tripId || group.routeId || group.routeName;
                    return (
                      <div
                        key={index}
                        className="bg-card rounded-xl p-6 shadow-card border-l-4 border-primary relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{group.routeName}</h3>
                            <p className="text-xs text-muted-foreground mt-1 break-all">
                              IDs: {group.bookingIds.join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2 mb-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{group.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Armchair className="w-4 h-4 text-muted-foreground" />
                            <span>{group.seatNumbers.sort((a:number, b:number) => a - b).map((s:number) => `#${s}`).join(', ')}</span>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          onClick={() => handleDownloadTicket(group)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Ticket
                        </Button>
                      </div>
                    );
                  })}
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