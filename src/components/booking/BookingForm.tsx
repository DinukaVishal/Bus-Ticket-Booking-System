import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Route } from '@/types/booking';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { User, Phone, Armchair, Loader2, Mail } from 'lucide-react';

interface BookingFormProps {
  route: Route;
  date: Date;
  selectedSeats: number[];
  onSubmit: (data: { passengerName: string; phoneNumber: string; email?: string }) => void;
  isSubmitting?: boolean;
  userEmail?: string;
}

const BookingForm = ({ route, date, selectedSeats, onSubmit, isSubmitting, userEmail }: BookingFormProps) => {
  const { t } = useLanguageContext();
  const [passengerName, setPassengerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState(userEmail ?? '');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});

  const totalPrice = route.price * selectedSeats.length;

  const validateForm = () => {
    const newErrors: { name?: string; phone?: string; email?: string } = {};
    
    if (!passengerName.trim()) {
      newErrors.name = t('form.fullName') + ' is required.';
    } else if (passengerName.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!phoneNumber.trim()) {
      newErrors.phone = t('form.phoneNumber') + ' is required.';
    } else if (!/^[\d\s\+\-()]{8,15}$/.test(phoneNumber)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!userEmail) {
      if (!email.trim()) {
        newErrors.email = t('form.emailAddress') + ' is required.';
      } else if (!/^\S+@\S+\.\S+$/.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        passengerName: passengerName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: userEmail ? undefined : email.trim(),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-card space-y-6 animate-slide-up">
      <h3 className="text-lg font-display font-semibold text-foreground">{t('form.title')}</h3>
      
      {/* Booking Summary */}
      <div className="bg-primary/5 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('form.route')}:</span>
          <span className="font-medium">{route.name}</span>
        </div>
        <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('form.date')}:</span>
          <span className="font-medium">{date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}</span>
        </div>
        <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('form.departure')}:</span>
          <span className="font-medium">{route.departureTime}</span>
        </div>
        <div className="flex justify-between text-sm items-start">
            <span className="text-muted-foreground">{t('form.seatNumbers')}:</span>
          <span className="flex items-center gap-1 font-semibold text-primary text-right">
            <Armchair className="w-4 h-4 flex-shrink-0" />
            {selectedSeats.join(', ')}
          </span>
        </div>
        <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('form.numberOfSeats')}:</span>
          <span className="font-medium">{selectedSeats.length}</span>
        </div>
        <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('form.pricePerSeat')}:</span>
          <span className="font-medium">LKR {route.price}</span>
        </div>
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between">
              <span className="font-medium">{t('form.totalPrice')}:</span>
            <span className="font-bold text-xl text-primary">LKR {totalPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="passengerName" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {t('form.fullName')}
          </Label>
          <Input
            id="passengerName"
            value={passengerName}
            onChange={(e) => setPassengerName(e.target.value)}
            placeholder={t('form.fullName')}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {t('form.phoneNumber')}
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

        {!userEmail && (
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t('form.emailAddress')}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
            <p className="text-sm text-muted-foreground">{t('form.guestEmailNote')}</p>
          </div>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('form.processing')}
          </>
        ) : (
          `${t('form.confirmBooking')} (${selectedSeats.length} ${selectedSeats.length === 1 ? 'seat' : 'seats'})`
        )}
      </Button>
    </form>
  );
};

export default BookingForm;
