import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bus,
  User,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Settings,
  Plus,
  Eye,
  Navigation,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DriverProfile {
  id: string;
  license_number: string;
  license_expiry: string;
  phone_number: string;
  emergency_contact: string | null;
  experience_years: number;
  is_verified: boolean;
}

interface DriverBus {
  id: string;
  bus_number: string;
  bus_type: string;
  total_seats: number;
  registration_number: string;
  is_active: boolean;
}

interface BookingWithDetails {
  id: string;
  booking_id: string;
  route_name: string;
  date: string;
  seat_number: number;
  passenger_name: string;
  phone_number: string;
  status: string;
}

const DriverDashboard = () => {
  const { user, isDriver } = useAuthContext();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [buses, setBuses] = useState<DriverBus[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isDriver) {
      navigate('/');
      return;
    }
    fetchDriverData();
  }, [isDriver, navigate]);

  const fetchDriverData = async () => {
    if (!user) return;

    try {
      // Fetch driver profile
      const { data: profileData } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(profileData);

      // Fetch driver buses
      const { data: busesData } = await supabase
        .from('driver_buses')
        .select('*')
        .eq('driver_user_id', user.id);

      setBuses(busesData || []);

      // Fetch bookings for routes assigned to this driver
      if (busesData && busesData.length > 0) {
        const { data: routesData } = await supabase
          .from('driver_routes')
          .select('route_id')
          .eq('driver_user_id', user.id)
          .eq('is_active', true);

        if (routesData && routesData.length > 0) {
          const routeIds = routesData.map(r => r.route_id);
          const { data: bookingsData } = await supabase
            .from('bookings')
            .select('*')
            .in('route_id', routeIds)
            .eq('status', 'confirmed')
            .order('date', { ascending: true });

          setBookings(bookingsData || []);
        }
      }

    } catch (error) {
      console.error('Error fetching driver data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load driver data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Driver Dashboard</h1>
          <p className="text-muted-foreground">Manage your buses, view bookings, and track your routes</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="buses">My Buses</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Buses</CardTitle>
                  <Bus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{buses.filter(b => b.is_active).length}</div>
                  <p className="text-xs text-muted-foreground">
                    Total buses: {buses.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total bookings: {bookings.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {profile?.is_verified ? 'Verified' : 'Pending'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    License expires: {profile?.license_expiry ? new Date(profile.license_expiry).toLocaleDateString() : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button asChild className="h-20 flex-col gap-2">
                  <Link to="/driver/add-bus">
                    <Plus className="h-6 w-6" />
                    Add New Bus
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-20 flex-col gap-2">
                  <Link to="/driver">
                    <Navigation className="h-6 w-6" />
                    Start GPS Tracking
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-20 flex-col gap-2">
                  <Link to="/driver/profile">
                    <Settings className="h-6 w-6" />
                    Update Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="buses" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Buses</h2>
              <Button asChild>
                <Link to="/driver/add-bus">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bus
                </Link>
              </Button>
            </div>

            {buses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bus className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No buses registered</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Add your first bus to start managing routes and bookings.
                  </p>
                  <Button asChild>
                    <Link to="/driver/add-bus">Add Your First Bus</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {buses.map((bus) => (
                  <Card key={bus.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Bus className="h-5 w-5" />
                            {bus.bus_number}
                          </CardTitle>
                          <Badge variant={bus.is_active ? "default" : "secondary"} className="mt-2">
                            {bus.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Type:</strong> {bus.bus_type}</p>
                        <p className="text-sm"><strong>Seats:</strong> {bus.total_seats}</p>
                        <p className="text-sm"><strong>Registration:</strong> {bus.registration_number}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <h2 className="text-2xl font-bold">Passenger Bookings</h2>

            {bookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
                  <p className="text-muted-foreground text-center">
                    Bookings for your assigned routes will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold">{booking.route_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.date).toLocaleDateString()} • Seat {booking.seat_number}
                          </p>
                        </div>
                        <Badge variant="outline">{booking.status}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{booking.passenger_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{booking.phone_number}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Driver Profile</h2>
              <Button asChild variant="outline">
                <Link to="/driver/profile">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            </div>

            {profile ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">License Number</label>
                      <p className="text-sm">{profile.license_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">License Expiry</label>
                      <p className="text-sm">{new Date(profile.license_expiry).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                      <p className="text-sm">{profile.phone_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Experience</label>
                      <p className="text-sm">{profile.experience_years} years</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Emergency Contact</label>
                      <p className="text-sm">{profile.emergency_contact || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Verification Status</label>
                      <Badge variant={profile.is_verified ? "default" : "secondary"}>
                        {profile.is_verified ? 'Verified' : 'Pending Verification'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Profile not found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Complete your driver profile to start using the system.
                  </p>
                  <Button asChild>
                    <Link to="/driver/profile">Create Profile</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DriverDashboard;