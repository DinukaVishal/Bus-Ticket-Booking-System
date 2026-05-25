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
  const [passengerDetails, setPassengerDetails] = useState<{ passengerName: string; phoneNumber: string; gender: 'male' | 'female' } | null>(null); // Store for payment


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
  const handleBookingSubmit = async (data: { passengerName: string; phoneNumber: string; gender: 'male' | 'female' }) => {
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
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-white/10 bg-slate-700/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-sky-300 mb-2">Booking progress</p>
            <h2 className="text-2xl font-display font-semibold text-white">Complete these few simple steps</h2>
          </div>
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">Step {step} of {STEPS.length}</div>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-4 lg:grid-cols-5">
            {STEPS.map((s, index) => (
              <div key={s.id} className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-4">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  step === s.id
                    ? "bg-sky-500 text-white shadow-xl"
                    : step > s.id
                      ? "bg-slate-800 text-sky-300"
                      : "bg-slate-800 text-slate-500"
                )}>
                  {step > s.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <s.icon className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium truncate", step === s.id ? 'text-white' : 'text-slate-300')}>
                    {s.title}
                  </p>
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden mt-2">
                    <div className={cn(
                      "h-full bg-sky-500 transition-all duration-500",
                      step > s.id ? 'w-full' : step === s.id ? 'w-1/2' : 'w-0'
                    )} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.8fr_0.9fr]">
        <div className="relative min-h-[620px]">
          <div className={cn(
            "absolute inset-0 transition-all duration-500 ease-out",
            step === 1 ? "translate-x-0 opacity-100 pointer-events-auto" : step > 1 ? "-translate-x-full opacity-0 pointer-events-none" : "translate-x-full opacity-0 pointer-events-none"
          )}>
            <div className="bg-slate-800/80 border border-white/10 rounded-[2rem] p-6 shadow-2xl backdrop-blur-xl h-full">
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
            <div className="bg-slate-800/80 border border-white/10 rounded-[2rem] p-6 shadow-2xl backdrop-blur-xl h-full">
              <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Select Travel Date
              </h2>
              {selectedRoute && selectedTrip && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                  <div>
                    <span className="text-yellow-400">Selected Route: </span>
                    <span className="font-medium">{selectedRoute.from} → {selectedRoute.to}</span>
                  </div>
                  <div>
                    <span className="text-orange-400">Trip: </span>
                    <span className="font-medium">{selectedTrip.departureTime} - {selectedTrip.arrivalTime || 'TBA'}</span>
                  </div>
                  <div>
                    <span className="text-red-300">Price: </span>
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
              <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-6 shadow-2xl backdrop-blur-xl h-full">
                {seatsLoading ? (
                  <div className="rounded-[1.75rem] bg-white/10 p-12 text-center text-slate-300 shadow-inner">
                    <Loader2 className="w-8 h-8 animate-spin text-sky-400 mx-auto" />
                    <p className="mt-4">Loading seats...</p>
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
                      <div className="rounded-[1.75rem] bg-white/10 p-4 shadow-xl border border-white/10 animate-fade-in">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <p className="text-sm text-slate-400">Selected Seats</p>
                            <p className="font-semibold text-lg text-white">
                              {selectedSeats.join(', ')} ({selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-400">Total Price</p>
                            <p className="font-bold text-2xl text-sky-300">
                              LKR {(selectedTrip?.price || 0) * selectedSeats.length}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-[1.75rem] bg-white/10 p-12 text-center text-slate-400 shadow-inner">
                    <Bus className="w-10 h-10 mx-auto mb-4 text-slate-300" />
                    <p>Please select a route, trip, and date first</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: Passenger Details */}
          <div className={cn(
            "absolute inset-0 transition-all duration-500 ease-out",
            step === 4 ? "translate-x-0 opacity-100 pointer-events-auto" : "translate-x-full opacity-0 pointer-events-none"
          )}>
            {selectedRoute && selectedDate && selectedSeats.length > 0 && (
              <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 shadow-2xl backdrop-blur-xl h-full">
                <BookingForm
                  route={selectedRoute}
                  date={selectedDate}
                  selectedSeats={selectedSeats}
                  onSubmit={handleBookingSubmit}
                  isSubmitting={addBookingsMutation.isPending}
                />
              </div>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-4 h-fit">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-300" />
                <h2 className="text-lg font-display font-semibold text-white">Route Overview</h2>
              </div>
              {selectedRoute && selectedTrip ? (
                <div className="mt-5 grid gap-3 rounded-[1.5rem] bg-white/10 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Route</span>
                    <span className="font-semibold text-white">{selectedRoute.from} → {selectedRoute.to}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Departure</span>
                    <span className="font-semibold text-white">{selectedTrip.departureTime}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Price</span>
                    <span className="font-semibold text-sky-300">LKR {selectedTrip.price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Bus Type</span>
                    <span className="font-semibold text-white">{selectedRoute.busType}</span>
                  </div>
                  {selectedRoute.viaPoints?.length ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Intermediate stops</span>
                      <span className="font-semibold text-white">
                        {selectedRoute.viaPoints.length} stop{selectedRoute.viaPoints.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4 text-sm text-slate-400">
                  Select a route and trip to preview the route map and summary.
                </div>
              )}
            </div>
            <RouteMap route={selectedRoute} selectedTrip={selectedTrip} className="h-[300px] lg:h-[400px]" />
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
            gender: passengerDetails.gender,
            totalAmount: (selectedTrip.price || 0) * selectedSeats.length,
          }}
          onPaymentSuccess={(bookings) => {
            // Call the parent onBookingComplete callback
            onBookingComplete(bookings, selectedRoute, selectedTrip);
          }}
          onCancel={() => setStep(4)}
        />
      )}

      {step < 5 && (
        <div className="flex flex-col gap-4 sm:flex-row justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 1}
            className={cn("transition-all w-full sm:w-auto", step === 1 && "invisible")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="w-full sm:w-auto px-8 bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg hover:from-sky-400 hover:to-sky-500"
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

