import { useState } from 'react';
import Header from '@/components/layout/Header';
import BookingWizard from '@/components/booking/BookingWizard';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import { Route, Booking, Trip } from '@/types/booking';
import { useRoutes } from '@/hooks/useRoutes';
import { Bus, Loader2 } from 'lucide-react';

const Index = () => {
  const { data: routes = [], isLoading: routesLoading } = useRoutes();
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);
  const [confirmedRoute, setConfirmedRoute] = useState<Route | null>(null);
  const [confirmedTrip, setConfirmedTrip] = useState<Trip | null>(null);

  const handleBookingComplete = (bookings: Booking[], route: Route, trip: Trip) => {
    setConfirmedBookings(bookings);
    setConfirmedRoute(route);
    setConfirmedTrip(trip);
  };

  const handleNewBooking = () => {
    setConfirmedBookings([]);
    setConfirmedRoute(null);
    setConfirmedTrip(null);
  };

  // Show confirmation page
  if (confirmedBookings.length > 0 && confirmedRoute && confirmedTrip) {
    return (
      <div className="min-h-screen page-shell page-bg bg-fixed text-white">
        <Header />
        <BookingConfirmation
          bookings={confirmedBookings}
          route={confirmedRoute}
          trip={confirmedTrip}
          onNewBooking={handleNewBooking}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-shell page-bg booking-blur bg-fixed text-white">
      <Header />
      <div className="absolute inset-0 pointer-events-none bg-black/10 backdrop-blur-lg" />
      <main className="relative z-10 container mx-auto px-4 py-10 pb-20">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl">
          {routesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
            </div>
          ) : (
            <BookingWizard 
              routes={routes} 
              onBookingComplete={handleBookingComplete} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
