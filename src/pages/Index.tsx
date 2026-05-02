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
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="gradient-hero text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bus className="w-10 h-10" />
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              Book Your Bus Ticket
            </h1>
          </div>
          <p className="text-primary-foreground/80 max-w-md mx-auto">
            Select your route, pick a date, and choose your preferred seats for a comfortable journey
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {routesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <BookingWizard 
            routes={routes} 
            onBookingComplete={handleBookingComplete} 
          />
        )}
      </main>
    </div>
  );
};

export default Index;
