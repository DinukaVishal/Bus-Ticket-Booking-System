import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Route, Booking, Trip } from '@/types/booking';
import { useBookedSeats, useAddMultipleBookings } from '@/hooks/useBookings';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  Calendar,
  Armchair,
  UserCircle,
  Check,
  Loader2,
  Bus,
  CreditCard
} from 'lucide-react';

import RouteSelector from './RouteSelector';
import DateSelector from './DateSelector';
import SeatLayout from './SeatLayout';
import BookingForm from './BookingForm';
import RouteMap from './RouteMap';
import PaymentPage from '../payment/PaymentPage';

interface BookingWizardProps {
  routes: Route[];
  onBookingComplete: (bookings: Booking[], route: Route, trip: Trip) => void;
}

const STEPS = [
  { id: 1, title: 'Route', icon: MapPin },
  { id: 2, title: 'Date', icon: Calendar },
  { id: 3, title: 'Seats', icon: Armchair },
  { id: 4, title: 'Details', icon: UserCircle },
  { id: 5, title: 'Payment', icon: CreditCard },
];

const BookingWizard = ({ routes, onBookingComplete }: BookingWizardProps) => {
  const [step, setStep] = useState(1);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [passengerDetails, setPassengerDetails] = useState<{
    passengerName: string;
    phoneNumber: string;
  } | null>(null);

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;

  const { data: bookedSeats = [], isLoading: seatsLoading } = useBookedSeats(
    selectedTrip?.id,
    dateStr
  );

  const addBookingsMutation = useAddMultipleBookings();

  useEffect(() => {
    setSelectedTrip(null);
    setSelectedSeats([]);
  }, [selectedRoute]);

  useEffect(() => {
    setSelectedSeats([]);
  }, [selectedTrip, selectedDate]);

  const handleSeatSelect = (seatNumber: number) => {
    setSelectedSeats(prev =>
      prev.includes(seatNumber)
        ? prev.filter(s => s !== seatNumber)
        : [...prev, seatNumber].sort((a, b) => a - b)
    );
  };

  const handleBookingSubmit = (data: { passengerName: string; phoneNumber: string }) => {
    setPassengerDetails(data);
    setStep(5);
  };

  const canGoNext = () => {
    switch (step) {
      case 1: return !!selectedRoute && !!selectedTrip;
      case 2: return !!selectedDate;
      case 3: return selectedSeats.length > 0;
      case 4: return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length && canGoNext()) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="space-y-6">

      {/* Progress Bar */}
      <div className="bg-card rounded-xl p-4 shadow-card">
        <div className="flex items-center justify-between">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => s.id < step && setStep(s.id)}
                disabled={s.id > step}
                className={cn(
                  "flex flex-col items-center gap-2",
                  step === s.id
                    ? "text-primary"
                    : step > s.id
                      ? "text-primary/70"
                      : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  step === s.id
                    ? "bg-primary text-white"
                    : step > s.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted"
                )}>
                  {step > s.id ? <Check /> : <s.icon />}
                </div>
                <span className="text-xs">{s.title}</span>
              </button>

              {index < STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-3 bg-muted">
                  <div className={cn("h-full bg-primary", step > s.id ? "w-full" : "w-0")} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Left Content */}
        <div className="relative min-h-[400px]">

          {/* Step 1 */}
          {step === 1 && (
            <div className="bg-card p-6 rounded-xl shadow-card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin /> Select Route
              </h2>
              <RouteSelector
                routes={routes}
                selectedRoute={selectedRoute}
                selectedTrip={selectedTrip}
                onRouteSelect={setSelectedRoute}
                onTripSelect={setSelectedTrip}
              />
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="bg-card p-6 rounded-xl shadow-card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar /> Select Date
              </h2>
              <DateSelector date={selectedDate} onDateSelect={setSelectedDate} />
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            seatsLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <SeatLayout
                bookedSeats={bookedSeats}
                selectedSeats={selectedSeats}
                onSeatSelect={handleSeatSelect}
                totalSeats={selectedRoute?.totalSeats || 0}
                busType={selectedRoute?.busType}
              />
            )
          )}

          {/* Step 4 */}
          {step === 4 && selectedRoute && selectedDate && (
            <BookingForm
              route={selectedRoute}
              date={selectedDate}
              selectedSeats={selectedSeats}
              onSubmit={handleBookingSubmit}
              isSubmitting={addBookingsMutation.isPending}
            />
          )}

          {/* Step 5 - PAYMENT */}
          {step === 5 && selectedRoute && selectedTrip && selectedDate && passengerDetails && (
            <PaymentPage
              bookingData={{
                tripId: selectedTrip.id,
                routeId: selectedRoute.id,
                routeName: `${selectedRoute.from} → ${selectedRoute.to}`,
                date: dateStr!,
                seatNumbers: selectedSeats.join(', '),
                passengerName: passengerDetails.passengerName,
                phoneNumber: passengerDetails.phoneNumber,
                totalAmount: selectedTrip.price * selectedSeats.length,
              }}
              onPaymentSuccess={(bookings) => {
                onBookingComplete(bookings, selectedRoute, selectedTrip);
              }}
              onCancel={() => setStep(4)}
            />
          )}
        </div>

        {/* Right Map */}
        <div>
          <RouteMap route={selectedRoute} />
        </div>
      </div>

      {/* Navigation */}
      {step < 5 && (
        <div className="flex justify-between">
          <Button onClick={handlePrev} disabled={step === 1}>
            <ArrowLeft /> Back
          </Button>

          <Button onClick={handleNext} disabled={!canGoNext()}>
            {step === 4 ? 'Proceed to Payment' : 'Next'}
            <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookingWizard;