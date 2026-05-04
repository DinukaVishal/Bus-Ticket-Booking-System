import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Route, Booking, Trip } from '@/types/booking';
import { useBookedSeats, useAddMultipleBookings } from '@/hooks/useBookings';
import { toast } from '@/hooks/use-toast';
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
  { id: 5, title: 'Payment', icon: CreditCard }, // New payment step
];


const BookingWizard = ({ routes, onBookingComplete }: BookingWizardProps) => {
  const [step, setStep] = useState(1);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [passengerDetails, setPassengerDetails] = useState<{ passengerName: string; phoneNumber: string } | null>(null); // Store for payment


  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const { data: bookedSeats = [], isLoading: seatsLoading } = useBookedSeats(selectedTrip?.id, dateStr);
  const addBookingsMutation = useAddMultipleBookings();

  // Reset selections when route changes
  useEffect(() => {
    setSelectedTrip(null);
    setSelectedSeats([]);
  }, [selectedRoute]);

  // Reset seats when trip or date changes
  useEffect(() => {
    setSelectedSeats([]);
  }, [selectedTrip, selectedDate]);

  const handleSeatSelect = (seatNumber: number) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatNumber)) {
        return prev.filter(s => s !== seatNumber);
      } else {
        return [...prev, seatNumber].sort((a, b) => a - b);
      }
    });
  };

  // Store passenger details and go to payment
  const handleBookingSubmit = async (data: { passengerName: string; phoneNumber: string }) => {
    setPassengerDetails(data);
    setStep(5); // Go to payment step
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
      {/* Step Progress Bar with Animation */}
      <div className="bg-card rounded-xl p-4 shadow-card">
        <div className="flex items-center justify-between">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => {
                  // Allow going back to completed steps
                  if (s.id < step) setStep(s.id);
                }}
                disabled={s.id > step}
                className={cn(
                  "flex flex-col items-center gap-2 transition-all",
                  step === s.id ? "text-primary" : step > s.id ? "text-primary/70 cursor-pointer" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ease-out",
                  step === s.id 
                    ? "bg-primary text-primary-foreground scale-110 shadow-lg animate-pulse" 
                    : step > s.id 
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}>
                  {step > s.id ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <s.icon className="w-6 h-6" />
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium transition-all",
                  step === s.id ? "font-semibold" : ""
                )}>
                  {s.title}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-3 rounded-full bg-muted overflow-hidden">
                  <div 
                    className={cn(
                      "h-full bg-primary transition-all duration-500 ease-out",
                      step > s.id ? "w-full" : "w-0"
                    )} 
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Main Content */}
        <div className="relative min-h-[400px]">
          {/* Step 1: Route Selection */}
          <div className={cn(
            "absolute inset-0 transition-all duration-500 ease-out",
            step === 1 ? "translate-x-0 opacity-100 pointer-events-auto" : step > 1 ? "-translate-x-full opacity-0 pointer-events-none" : "translate-x-full opacity-0 pointer-events-none"
          )}>
            <div className="bg-card rounded-xl p-6 shadow-card h-full">
              <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Select Your Route
              </h2>
              <RouteSelector
                routes={routes}
                selectedRoute={selectedRoute}
                selectedTrip={selectedTrip}
                onRouteSelect={setSelectedRoute}
                onTripSelect={setSelectedTrip}
              />
            </div>
          </div>

          {/* Step 2: Date Selection */}
          <div className={cn(
            "absolute inset-0 transition-all duration-500 ease-out",
            step === 2 ? "translate-x-0 opacity-100 pointer-events-auto" : step > 2 ? "-translate-x-full opacity-0 pointer-events-none" : "translate-x-full opacity-0 pointer-events-none"
          )}>
            <div className="bg-card rounded-xl p-6 shadow-card h-full">
              <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Select Travel Date
              </h2>
              {selectedRoute && selectedTrip && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                  <div>
                    <span className="text-muted-foreground">Selected Route: </span>
                    <span className="font-medium">{selectedRoute.from} → {selectedRoute.to}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trip: </span>
                    <span className="font-medium">{selectedTrip.departureTime} - {selectedTrip.arrivalTime || 'TBA'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price: </span>
                    <span className="font-medium">LKR {selectedTrip.price.toLocaleString()}</span>
                  </div>
                </div>
              )}
              <DateSelector date={selectedDate} onDateSelect={setSelectedDate} />
            </div>
          </div>

          {/* Step 3: Seat Selection */}
          <div className={cn(
            "absolute inset-0 transition-all duration-500 ease-out overflow-y-auto",
            step === 3 ? "translate-x-0 opacity-100 pointer-events-auto" : step > 3 ? "-translate-x-full opacity-0 pointer-events-none" : "translate-x-full opacity-0 pointer-events-none"
          )}>
            <div className="space-y-4">
              {seatsLoading ? (
                <div className="bg-card rounded-xl p-12 shadow-card text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground mt-4">Loading seats...</p>
                </div>
              ) : selectedRoute && selectedTrip && selectedDate ? (
                <>
                  <SeatLayout
                    bookedSeats={bookedSeats}
                    selectedSeats={selectedSeats}
                    onSeatSelect={handleSeatSelect}
                    totalSeats={selectedRoute.totalSeats}
                    busType={selectedRoute.busType}
                  />
                  
                  {selectedSeats.length > 0 && (
                    <div className="bg-card rounded-xl p-4 shadow-card border animate-fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Selected Seats</p>
                          <p className="font-semibold text-lg">
                            {selectedSeats.join(', ')} ({selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Price</p>
                          <p className="font-bold text-2xl text-primary">
                            LKR {(selectedTrip?.price || 0) * selectedSeats.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-card rounded-xl p-12 shadow-card text-center">
                  <Bus className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Please select a route, trip, and date first</p>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Passenger Details */}
          <div className={cn(
            "absolute inset-0 transition-all duration-500 ease-out",
            step === 4 ? "translate-x-0 opacity-100 pointer-events-auto" : "translate-x-full opacity-0 pointer-events-none"
          )}>
            {selectedRoute && selectedDate && selectedSeats.length > 0 && (
              <BookingForm
                route={selectedRoute}
                date={selectedDate}
                selectedSeats={selectedSeats}
                onSubmit={handleBookingSubmit}
                isSubmitting={addBookingsMutation.isPending}
              />
            )}
          </div>
        </div>

        {/* Route Map */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-display font-semibold">Route Map</h2>
              </div>
            </div>
            <RouteMap route={selectedRoute} className="h-[300px] lg:h-[400px]" />
          </div>
        </div>
      </div>

      {/* Step 5: Payment */}
      {step === 5 && selectedRoute && selectedTrip && selectedDate && passengerDetails && selectedSeats.length > 0 && (
        <PaymentPage
          bookingData={{
            tripId: selectedTrip.id,
            routeId: selectedRoute.id,
            routeName: `${selectedRoute.from} → ${selectedRoute.to}`,
            date: dateStr!,
              seatNumbers: selectedSeats.sort((a,b)=>a-b).join(', '),
            passengerName: passengerDetails.passengerName,
            phoneNumber: passengerDetails.phoneNumber,
            totalAmount: (selectedTrip.price || 0) * selectedSeats.length,
          }}
          onPaymentSuccess={(bookings) => {
            // Call the parent onBookingComplete callback
            onBookingComplete(bookings, selectedRoute, selectedTrip);
          }}
          onCancel={() => setStep(4)}
        />
      )}

      {/* Navigation Buttons */}
      {step < 5 && (
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 1}
            className={cn("transition-all", step === 1 && "invisible")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="px-8"
          >
            {step === 4 ? 'Proceed to Payment' : 'Continue'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookingWizard;

