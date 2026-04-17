import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Route } from '@/types/booking';
import { User, Phone, Armchair, Loader2 } from 'lucide-react';

interface BookingFormProps {
  route: Route;
  date: Date;
  selectedSeats: number[];
  onSubmit: (data: { passengerName: string; phoneNumber: string }) => void;
  isSubmitting?: boolean;
}

const BookingForm = ({ route, date, selectedSeats, onSubmit, isSubmitting }: BookingFormProps) => {
  const [passengerName, setPassengerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const totalPrice = route.price * selectedSeats.length;

  const validateForm = () => {
    const newErrors: { name?: string; phone?: string } = {};
    
    if (!passengerName.trim()) {
      newErrors.name = 'Please enter passenger name';
    } else if (passengerName.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!phoneNumber.trim()) {
      newErrors.phone = 'Please enter phone number';
    } else if (!/^[\d\s\+\-()]{8,15}$/.test(phoneNumber)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ passengerName: passengerName.trim(), phoneNumber: phoneNumber.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-card space-y-6 animate-slide-up">
      <h3 className="text-lg font-display font-semibold text-foreground">Passenger Details</h3>
      
      {/* Booking Summary */}
      <div className="bg-primary/5 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Route:</span>
          <span className="font-medium">{route.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Date:</span>
          <span className="font-medium">{date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Departure:</span>
          <span className="font-medium">{route.departureTime}</span>
        </div>
        <div className="flex justify-between text-sm items-start">
          <span className="text-muted-foreground">Seat Numbers:</span>
          <span className="flex items-center gap-1 font-semibold text-primary text-right">
            <Armchair className="w-4 h-4 flex-shrink-0" />
            {selectedSeats.join(', ')}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Number of Seats:</span>
          <span className="font-medium">{selectedSeats.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Price per Seat:</span>
          <span className="font-medium">LKR {route.price}</span>
        </div>
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between">
            <span className="font-medium">Total Price:</span>
            <span className="font-bold text-xl text-primary">LKR {totalPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="passengerName" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Full Name
          </Label>
          <Input
            id="passengerName"
            value={passengerName}
            onChange={(e) => setPassengerName(e.target.value)}
            placeholder="Enter passenger's full name"
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number
          </Label>
          <Input
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+94 XX XXX XXXX"
            className={errors.phone ? 'border-destructive' : ''}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Confirm Booking (${selectedSeats.length} ${selectedSeats.length === 1 ? 'seat' : 'seats'})`
        )}
      </Button>
    </form>
  );
};

export default BookingForm;
