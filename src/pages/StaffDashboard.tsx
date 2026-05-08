import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import SeatLayout from '@/components/booking/SeatLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bus,
  Calendar,
  MapPin,
  Users,
  Power,
  PowerOff,
  Radio,
  AlertCircle,
  Loader2,
  LogOut,
  Eye,
  Navigation,
  Phone,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { cn } from '@/lib/utils';
import { BusType } from '@/types/booking';

interface StaffSession {
  busId: string;
  busNumber: string;
  busType: string;
  totalSeats: number;
  accessCode: string;
  loginTime: string;
}

interface TripInfo {
  id: string;
  route_id: string;
  departure_time: string;
  arrival_time: string | null;
  price: number;
  routes: {
    name: string;
    from_city: string;
    to_city: string;
  };
}

interface BookedSeat {
  seat_number: number;
  passenger_name: string;
  phone_number: string;
  gender: 'male' | 'female';
}

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [trips, setTrips] = useState<TripInfo[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [bookedSeats, setBookedSeats] = useState<BookedSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookedSeatsLoading, setBookedSeatsLoading] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<BookedSeat | null>(null);
  const [showPassengerModal, setShowPassengerModal] = useState(false);

  // GPS tracking
  const {
    isSharing,
    error: gpsError,
    latitude,
    longitude,
    accuracy,
    startSharing,
    stopSharing,
  } = useDriverLocation(selectedTrip?.route_id || null, true);

  useEffect(() => {
    // Check if staff is logged in
    const session = localStorage.getItem('bus_staff_session');
    if (!session) {
      navigate('/staff/login');
      return;
    }

    try {
      const parsedSession = JSON.parse(session);
      setStaffSession(parsedSession);
      loadTrips(parsedSession.busId);
    } catch (error) {
      console.error('Invalid session:', error);
      localStorage.removeItem('bus_staff_session');
      navigate('/staff/login');
    }
  }, [navigate]);

  const loadTrips = async (busId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);

      // Use RPC for staff trip access so staff can load trips without owner auth.
      const { data: tripsData, error: tripsError } = await supabase.rpc(
        'get_staff_trips_by_owner_bus_id',
        { _owner_bus_id: busId }
      );

      if (tripsError) throw tripsError;

      const tripRecords = Array.isArray(tripsData) ? tripsData : [];
      const sanitizedTrips = tripRecords.map((trip: any) => {
        const routesData = trip.routes || {
          name: trip.route_name,
          from_city: trip.from_city,
          to_city: trip.to_city,
        };

        return {
          id: trip.id,
          route_id: trip.route_id,
          departure_time: trip.departure_time,
          arrival_time: trip.arrival_time,
          price: trip.price,
          routes: {
            name: routesData.name,
            from_city: routesData.from_city,
            to_city: routesData.to_city,
          },
        };
      });

      setTrips(sanitizedTrips);
    } catch (error: any) {
      console.error('Error loading trips:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trips.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBookedSeats = async (tripId: string, date: string) => {
    setBookedSeatsLoading(true);
    try {
      if (!tripId) {
        setBookedSeatsLoading(false);
        return;
      }

      // Use RPC for staff booking access so staff can view bookings without auth
      const { data: bookings, error } = await supabase.rpc(
        'get_staff_bookings_for_trip',
        {
          _trip_id: tripId,
          _date: date
        }
      );

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('Bookings loaded:', bookings);
      setBookedSeats(bookings || []);
    } catch (error: any) {
      console.error('Error loading booked seats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load booked seats: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setBookedSeatsLoading(false);
    }
  };

  const handleTripSelect = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    setSelectedTrip(trip || null);

    if (trip && selectedDate) {
      loadBookedSeats(trip.id, selectedDate);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (selectedTrip) {
      loadBookedSeats(selectedTrip.id, date);
    }
  };

  const handleLogout = () => {
    if (isSharing && stopSharing) {
      stopSharing();
    }
    localStorage.removeItem('bus_staff_session');
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    });
    navigate('/staff/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background/60 backdrop-blur-xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!staffSession) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl flex flex-col">
      <Header isStaff={true} />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">
              Staff Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bus: {staffSession.busNumber} • {staffSession.busType} • {staffSession.totalSeats} seats
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Trip Selection & GPS */}
          <div className="lg:col-span-1 space-y-6">
            {/* Trip Selection */}
            <Card className="shadow-md border-2">
              <CardHeader className="pb-3 bg-muted/30 border-b">
                <CardTitle className="text-base flex items-center gap-2 font-bold">
                  <Calendar className="w-4 h-4 text-primary" />
                  Select Trip & Date
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trip</label>
                  <Select value={selectedTrip?.id || ''} onValueChange={handleTripSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a trip" />
                    </SelectTrigger>
                    <SelectContent>
                      {trips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id}>
                          <div className="flex flex-col">
                            <span className="font-semibold">{trip.routes.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {trip.departure_time} • LKR {trip.price}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {selectedTrip && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm space-y-1">
                    <p className="font-extrabold text-primary">{selectedTrip.routes.name}</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {selectedTrip.routes.from_city} → {selectedTrip.routes.to_city}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      🕐 {selectedTrip.departure_time} • LKR {selectedTrip.price}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GPS Control */}
            <Card className="shadow-md border-2">
              <CardHeader className="pb-3 bg-muted/30 border-b">
                <CardTitle className="text-base flex items-center gap-2 font-bold">
                  <Navigation className="w-4 h-4 text-primary" />
                  GPS Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <Button
                  onClick={isSharing ? stopSharing : startSharing}
                  disabled={!selectedTrip}
                  variant={isSharing ? 'destructive' : 'default'}
                  className={cn(
                    "w-full h-12 text-base gap-3 font-bold shadow-md transition-all duration-300",
                    isSharing ? "bg-rose-500 hover:bg-rose-600" : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isSharing ? (
                    <>
                      <PowerOff className="w-5 h-5" />
                      Stop GPS
                    </>
                  ) : (
                    <>
                      <Power className="w-5 h-5" />
                      Start GPS
                    </>
                  )}
                </Button>

                {gpsError && (
                  <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {gpsError}
                  </div>
                )}

                {isSharing && (
                  <div className="mt-4 space-y-3">
                    <Badge variant="secondary" className="w-full justify-center py-2">
                      📡 GPS Active - Passengers can track you
                    </Badge>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-muted text-center">
                        <div className="font-semibold">Lat</div>
                        <div className="font-mono">{latitude?.toFixed(4) || '—'}</div>
                      </div>
                      <div className="p-2 rounded bg-muted text-center">
                        <div className="font-semibold">Lng</div>
                        <div className="font-mono">{longitude?.toFixed(4) || '—'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Seat Layout */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-2">
              <CardHeader className="pb-3 bg-muted/30 border-b">
                <CardTitle className="text-base flex items-center gap-2 font-bold">
                  <Eye className="w-4 h-4 text-primary" />
                  Seat Layout & Bookings
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {selectedTrip && selectedDate ? (
                  <>
                    {bookedSeatsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="ml-2">Loading seat data...</span>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{selectedTrip.routes.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {selectedDate} • {selectedTrip.departure_time}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-sm">
                            {bookedSeats.length} / {staffSession.totalSeats} seats booked
                          </Badge>
                        </div>

                        <div className="mb-6">
                          <p className="text-xs text-muted-foreground mb-3 italic">
                            💡 Click on a booked seat to view passenger details
                          </p>
                          <SeatLayout
                            bookedSeats={bookedSeats.map(seat => ({
                              seatNumber: seat.seat_number,
                              gender: seat.gender
                            }))}
                            selectedSeats={[]}
                            onSeatSelect={(seatNumber: number) => {
                              const seat = bookedSeats.find(s => s.seat_number === seatNumber);
                              if (seat) {
                                setSelectedSeat(seat);
                                setShowPassengerModal(true);
                              }
                            }}
                            totalSeats={staffSession.totalSeats}
                            busType={staffSession.busType as BusType}
                            readOnly={false}
                          />
                        </div>

                        {bookedSeats.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                            <h3 className="font-semibold text-muted-foreground mb-2">No Bookings</h3>
                            <p className="text-sm text-muted-foreground">
                              No confirmed bookings for this trip on the selected date.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bus className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="font-semibold text-muted-foreground mb-2">Select a Trip & Date</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a trip and date to view the seat layout and booked seats.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Passenger Details Modal */}
            <Dialog open={showPassengerModal} onOpenChange={setShowPassengerModal}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Passenger Details</DialogTitle>
                  <DialogDescription>
                    Information for booked seat
                  </DialogDescription>
                </DialogHeader>
                {selectedSeat && (
                  <div className="space-y-4">
                    <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg",
                          selectedSeat.gender === 'female' ? 'bg-pink-400' : 'bg-blue-400'
                        )}>
                          {selectedSeat.gender === 'female' ? '♀' : '♂'}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Seat Number</p>
                          <p className="text-2xl font-bold">{selectedSeat.seat_number}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Passenger Name
                        </label>
                        <p className="text-foreground font-semibold mt-1 flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          {selectedSeat.passenger_name}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Contact Number
                        </label>
                        <p className="text-foreground font-semibold mt-1 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-primary" />
                          {selectedSeat.phone_number}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Gender
                        </label>
                        <div className="mt-1">
                          <Badge variant="secondary" className={cn(
                            "capitalize",
                            selectedSeat.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          )}>
                            {selectedSeat.gender}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                      <span className="text-lg">ℹ️</span>
                      <p>Use this information to assist the passenger during boarding and throughout the journey.</p>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;