import { Booking, Route, Trip } from '@/types/booking';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Ticket, Download } from 'lucide-react';
import { generateTicketPDF } from '@/lib/pdfTicketGenerator';

interface BookingConfirmationProps {
  bookings: Booking[];
  route: Route;
  trip: Trip;
  onNewBooking: () => void;
}

const BookingConfirmation = ({ bookings, route, trip, onNewBooking }: BookingConfirmationProps) => {
  const firstBooking = bookings[0];
  const seatNumbers = bookings.map(b => b.seatNumber).sort((a, b) => a - b);
  const totalPrice = trip.price * bookings.length;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-card p-8 max-w-md w-full text-center animate-scale-in">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-seat-available/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-seat-available" />
        </div>

        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          Booking Confirmed!
        </h2>
        <p className="text-muted-foreground mb-6">
          {bookings.length === 1 
            ? 'Your seat has been successfully reserved'
            : `Your ${bookings.length} seats have been successfully reserved`
          }
        </p>

        {/* Ticket Card */}
        <div className="bg-primary/5 rounded-xl p-6 mb-6 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -left-3 top-1/2 w-6 h-6 bg-background rounded-full" />
          <div className="absolute -right-3 top-1/2 w-6 h-6 bg-background rounded-full" />
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Ticket className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              {bookings.length === 1 ? 'Booking ID' : 'Booking IDs'}
            </span>
          </div>
          
          {bookings.length === 1 ? (
            <p className="text-2xl font-mono font-bold text-primary mb-4">{firstBooking.id}</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {bookings.map(b => (
                <span key={b.id} className="text-sm font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                  {b.id}
                </span>
              ))}
            </div>
          )}
          
          <div className="border-t border-dashed border-border pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Passenger</span>
              <span className="font-medium">{firstBooking.passengerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{firstBooking.phoneNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Route</span>
              <span className="font-medium">{firstBooking.routeName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">
                {new Date(firstBooking.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Departure</span>
              <span className="font-medium">{trip.departureTime}</span>
            </div>
            {trip.arrivalTime && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Arrival</span>
                <span className="font-medium">{trip.arrivalTime}</span>
              </div>
            )}
            <div className="flex justify-between text-sm items-start">
              <span className="text-muted-foreground">
                {bookings.length === 1 ? 'Seat' : 'Seats'}
              </span>
              <span className="font-bold text-primary text-lg text-right">
                #{seatNumbers.join(', #')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Number of Seats</span>
              <span className="font-medium">{bookings.length}</span>
            </div>
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between">
                <span className="font-medium">Total Amount</span>
                <span className="font-bold text-xl text-primary">LKR {totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => {
              const tickets = bookings.map(booking => ({ booking, route, trip }));
              generateTicketPDF(tickets);
            }} 
            className="w-full h-12"
            variant="default"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Ticket{bookings.length > 1 ? 's' : ''} (PDF)
          </Button>
          <Button onClick={onNewBooking} variant="outline" className="w-full h-12">
            <Home className="w-4 h-4 mr-2" />
            Book Another Ticket
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Please save your booking {bookings.length === 1 ? 'ID' : 'IDs'} for future reference
        </p>
      </div>
    </div>
  );
};

export default BookingConfirmation;
