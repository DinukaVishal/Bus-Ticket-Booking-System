import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Route, Booking } from '@/types/booking';
import { useBookedSeats, useAddMultipleBookings, useSeatHolds } from '@/hooks/useBookings';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { sendBookingEmail } from '@/lib/emailService';
import { generateTicketPDF } from '@/lib/pdfTicketGenerator';
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
  Bus
} from 'lucide-react';
import RouteSelector from './RouteSelector';
import DateSelector from './DateSelector';
import SeatLayout from './SeatLayout';
import BookingForm from './BookingForm';
import RouteMap from './RouteMap';

interface BookingWizardProps {
  routes: Route[];
  onBookingComplete: (bookings: Booking[], route: Route) => void;
}

const BookingWizard = ({ routes, onBookingComplete }: BookingWizardProps) => {
  const [step, setStep] = useState(1);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [isHoldingSeats, setIsHoldingSeats] = useState(false);

  const { user } = useAuthContext();
  const { t } = useLanguageContext();
  const { holdSeats, releaseHold } = useSeatHolds();

  const steps = [
    { id: 1, title: t('steps.route'), icon: MapPin },
    { id: 2, title: t('steps.date'), icon: Calendar },
    { id: 3, title: t('steps.seats'), icon: Armchair },
    { id: 4, title: t('steps.details'), icon: UserCircle },
  ];

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const { data: bookedSeats = [], isLoading: seatsLoading } = useBookedSeats(selectedRoute?.id, dateStr);
  const addBookingsMutation = useAddMultipleBookings();

  // Reset seat selection when route or date changes
  useEffect(() => {
    setSelectedSeats([]);
  }, [selectedRoute, selectedDate]);

  const handleSeatSelect = (seatNumber: number) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatNumber)) {
        return prev.filter(s => s !== seatNumber);
      } else {
        return [...prev, seatNumber].sort((a, b) => a - b);
      }
    });
  };

  const clearHold = async () => {
    if (!holdToken) return;
    try {
      await releaseHold.mutateAsync(holdToken);
    } catch {
      // Ignore release failures during cleanup
    } finally {
      setHoldToken(null);
      setHoldExpiresAt(null);
    }
  };

  useEffect(() => {
    return () => {
      if (holdToken) {
        releaseHold.mutate(holdToken, {
          onError: () => undefined,
        });
      }
    };
  }, [holdToken]);

  useEffect(() => {
    if (!holdExpiresAt) return;

    const timer = window.setInterval(() => {
      if (holdExpiresAt && Date.now() >= holdExpiresAt.getTime()) {
        setHoldToken(null);
        setHoldExpiresAt(null);
        toast({
          title: 'Seat Hold Expired',
          description: 'Your seat hold has expired. Please reselect seats.',
          variant: 'destructive',
        });
        setStep(3);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [holdExpiresAt]);

  const formatHoldTimer = () => {
    if (!holdExpiresAt) return '00:00';
    const seconds = Math.max(0, Math.floor((holdExpiresAt.getTime() - Date.now()) / 1000));
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const ensureSeatHold = async () => {
    if (!selectedRoute || !selectedDate || selectedSeats.length === 0) return;

    if (holdToken && holdExpiresAt && Date.now() < holdExpiresAt.getTime()) {
      return;
    }

    await clearHold();
    const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const seats = await holdSeats.mutateAsync({
      routeId: selectedRoute.id,
      date: dateStr!,
      seatNumbers: selectedSeats,
      holdToken: token,
    });

    if (seats.length !== selectedSeats.length) {
      throw new Error('Some seats are already unavailable. Please select different seats.');
    }

    setHoldToken(token);
    setHoldExpiresAt(new Date(Date.now() + 10 * 60 * 1000));
  };

  const handleBookingSubmit = async (data: { passengerName: string; phoneNumber: string; email?: string }) => {
    if (!selectedRoute || !selectedDate || selectedSeats.length === 0) return;

    try {
      const bookings = await addBookingsMutation.mutateAsync({
        routeId: selectedRoute.id,
        routeName: selectedRoute.name,
        date: dateStr!,
        seatNumbers: selectedSeats,
        passengerName: data.passengerName,
        phoneNumber: data.phoneNumber,
        guestEmail: data.email ?? user?.email ?? null,
        status: 'confirmed',
      });

      if (holdToken) {
        try {
          await releaseHold.mutateAsync(holdToken);
        } catch {
          // ignore release errors after successful booking
        }
      }

      const tickets = bookings.map((booking) => ({ booking, route: selectedRoute }));
      await generateTicketPDF(tickets);

      const recipientEmail = data.email || user?.email;
      if (recipientEmail) {
        const emailSent = await sendBookingEmail({
          to_name: data.passengerName,
          to_email: recipientEmail,
          booking_id: bookings.map((b) => b.id).join(', '),
          route_name: selectedRoute.name,
          date: dateStr!,
          seats: selectedSeats.join(', '),
          total_price: `LKR ${(selectedRoute.price || 0) * selectedSeats.length}`,
        });

        toast({
          title: emailSent ? 'Confirmation email sent' : 'Email notification failed',
          description: emailSent
            ? 'Your booking confirmation has been emailed.'
            : 'Your booking is confirmed but email notification did not send.',
          variant: emailSent ? 'default' : 'destructive',
        });
      }

      onBookingComplete(bookings, selectedRoute);
    } catch (error: any) {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Some seats were just booked by someone else. Please select different seats.',
        variant: 'destructive',
      });
      setStep(3);
      setSelectedSeats([]);
      if (holdToken) {
        await clearHold();
      }
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 1: return !!selectedRoute;
      case 2: return !!selectedDate;
      case 3: return selectedSeats.length > 0;
      default: return true;
    }
  };

  const handleNext = async () => {
    if (!canGoNext()) return;

    if (step === 3) {
      setIsHoldingSeats(true);
      try {
        await ensureSeatHold();
        setStep(step + 1);
      } catch (error: any) {
        toast({
          title: t('hold.waiting'),
          description: error?.message || t('submit.failed'),
          variant: 'destructive',
        });
        setStep(3);
      } finally {
        setIsHoldingSeats(false);
      }
      return;
    }

    if (step < steps.length) {
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
          {steps.map((s, index) => (
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
              {index < steps.length - 1 && (
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
                  {t('steps.route')}
              </h2>
              <RouteSelector
                routes={routes}
                selectedRoute={selectedRoute}
                onRouteSelect={setSelectedRoute}
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
                  {t('steps.date')}
              </h2>
              {selectedRoute && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                  <span className="text-muted-foreground">Selected Route: </span>
                  <span className="font-medium">{selectedRoute.name}</span>
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
                  <p className="text-muted-foreground mt-4">{t('loading.seats')}</p>
                </div>
              ) : selectedRoute && selectedDate ? (
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
                            LKR {(selectedRoute.price || 0) * selectedSeats.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-card rounded-xl p-12 shadow-card text-center">
                  <Bus className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('selectRouteFirst')}</p>
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
              <div className="space-y-4">
                {holdExpiresAt && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary font-medium">
                      {t('form.seatHold')} <span className="font-semibold">{formatHoldTimer()}</span>.
                  </div>
                )}

                <BookingForm
                  route={selectedRoute}
                  date={selectedDate}
                  selectedSeats={selectedSeats}
                  onSubmit={handleBookingSubmit}
                  isSubmitting={addBookingsMutation.isPending}
                  userEmail={user?.email ?? undefined}
                />
              </div>
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

      {/* Navigation Buttons */}
      {step < 4 && (
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 1}
            className={cn("transition-all", step === 1 && "invisible")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('button.back')}
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canGoNext() || isHoldingSeats}
            className="px-8"
          >
            {isHoldingSeats ? t('hold.waiting') : t('button.continue')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookingWizard;
