import { useState, useEffect, useMemo } from 'react';
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
  Settings,
  Plus,
  Navigation,
  Loader2,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import TripWizard from '@/components/driver/TripWizard';
import { Route, Trip, BusType } from '@/types/booking';

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
  route_id: string;
  route_name: string;
  date: string;
  seat_number: number;
  passenger_name: string;
  phone_number: string;
  status: string;
}

interface DriverRouteAssignment {
  busId: string;
  routeId: string;
  routeName: string;
  from: string;
  to: string;
  busNumber: string;
  busType: string;
  totalSeats: number;
  registrationNumber: string;
  isActive: boolean;
  trips: Trip[];
}

const DriverDashboard = () => {
  const { user, isDriver } = useAuthContext();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [buses, setBuses] = useState<DriverBus[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [assignments, setAssignments] = useState<DriverRouteAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<DriverRouteAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTripWizard, setShowTripWizard] = useState(false);
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);
  const [deletingBusId, setDeletingBusId] = useState<string | null>(null);

  const bookingsGroupedByBus = useMemo(() => {
    return assignments.map((assignment) => ({
      busId: assignment.busId,
      busNumber: assignment.busNumber,
      routeName: assignment.routeName,
      bookings: bookings.filter((booking) => booking.route_id === assignment.routeId),
    }));
  }, [assignments, bookings]);

  const otherBookings = useMemo(
    () => bookings.filter((booking) => !assignments.some((assignment) => assignment.routeId === booking.route_id)),
    [assignments, bookings]
  );

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

      // Fetch driver route assignments with the assigned bus
      const { data: routesData, error: routeError } = await supabase
        .from('driver_routes')
        .select(
          'bus_id, route_id, is_active, routes(id, name, from_city, to_city), driver_buses(id, bus_number, bus_type, total_seats, registration_number, is_active)'
        )
        .eq('driver_user_id', user.id)
        .eq('is_active', true);

      if (routeError) throw routeError;

      const assignmentsData = (routesData || []).map((entry: any) => ({
        busId: entry.bus_id,
        routeId: entry.route_id,
        routeName: entry.routes?.name || '',
        from: entry.routes?.from_city || '',
        to: entry.routes?.to_city || '',
        busNumber: entry.driver_buses?.bus_number || '',
        busType: entry.driver_buses?.bus_type || 'normal',
        totalSeats: entry.driver_buses?.total_seats || 0,
        registrationNumber: entry.driver_buses?.registration_number || '',
        isActive: entry.driver_buses?.is_active ?? false,
        trips: [] as Trip[],
      }));

      const busIds = assignmentsData.map(a => a.busId).filter(Boolean);
      let tripsData: any[] = [];

      if (busIds.length > 0) {
        const { data: tripsRows, error: tripsError } = await supabase
          .from('trips')
          .select('*')
          .in('bus_id', busIds)
          .eq('is_active', true)
          .order('departure_time');

        if (tripsError) throw tripsError;
        tripsData = tripsRows || [];
      }

      setAssignments(assignmentsData.map((assignment) => ({
        ...assignment,
        trips: tripsData
          .filter(trip => trip.bus_id === assignment.busId)
          .map((trip) => ({
            id: trip.id,
            routeId: trip.route_id,
            busId: trip.bus_id,
            departureTime: trip.departure_time,
            arrivalTime: trip.arrival_time || undefined,
            price: trip.price,
            busNumber: trip.bus_number || undefined,
            driverName: trip.driver_name || undefined,
            driverPhone: trip.driver_phone || undefined,
            conductorName: trip.conductor_name || undefined,
            conductorPhone: trip.conductor_phone || undefined,
          }))
      })));

      // Fetch bookings for routes assigned to this driver
      const routeIds = assignmentsData.map((assignment) => assignment.routeId).filter(Boolean);
      if (routeIds.length > 0) {
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*')
          .in('route_id', routeIds)
          .eq('status', 'confirmed')
          .order('date', { ascending: true });

        setBookings(bookingsData || []);
      } else {
        setBookings([]);
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

  const handleDeleteBus = async (busId: string, busNumber: string) => {
    if (!user) return;

    const confirmed = window.confirm(
      `Delete bus ${busNumber} and remove its scheduled trips?`
    );

    if (!confirmed) return;

    try {
      setDeletingBusId(busId);
      const { error } = await supabase
        .from('driver_buses')
        .delete()
        .eq('id', busId);

      if (error) throw error;

      toast({
        title: 'Bus Deleted',
        description: 'The bus and its associated schedules have been removed.',
      });

      await fetchDriverData();
    } catch (error: any) {
      toast({
        title: 'Error Deleting Bus',
        description: error.message || 'Could not delete the bus.',
        variant: 'destructive',
      });
    } finally {
      setDeletingBusId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background/60 backdrop-blur-xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Driver Dashboard</h1>
          <p className="text-muted-foreground">Manage your buses, view bookings, and track your routes</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="buses">My Buses</TabsTrigger>
            <TabsTrigger value="trips">Manage Trips</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-blue-50 rounded-xl p-8 text-blue-900 shadow-lg border border-blue-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Bus className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Welcome back, Driver!</h2>
                  <p className="text-blue-700">Ready to hit the road? Here's your dashboard overview.</p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-800">Active Buses</CardTitle>
                  <div className="p-2 bg-green-100 rounded-full">
                    <Bus className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900 mb-1">{buses.filter(b => b.is_active).length}</div>
                  <p className="text-xs text-green-700">
                    Total buses: {buses.length}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-800">Today's Bookings</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900 mb-1">
                    {bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length}
                  </div>
                  <p className="text-xs text-blue-700">
                    Total bookings: {bookings.length}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-800">Profile Status</CardTitle>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900 mb-1">
                    {profile?.is_verified ? 'Verified' : 'Pending'}
                  </div>
                  <p className="text-xs text-purple-700">
                    License expires: {profile?.license_expiry ? new Date(profile.license_expiry).toLocaleDateString() : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-slate-50 border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <div className="p-2 bg-slate-100 rounded-full">
                    <Settings className="h-5 w-5 text-slate-600" />
                  </div>
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button asChild className="h-24 flex-col gap-3 bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Link to="/driver/add-bus">
                    <div className="p-2 bg-green-200 rounded-full">
                      <Plus className="h-6 w-6" />
                    </div>
                    Add New Bus
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-24 flex-col gap-3 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300">
                  <Link to="/driver">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Navigation className="h-6 w-6 text-blue-600" />
                    </div>
                    Start GPS Tracking
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-24 flex-col gap-3 border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300">
                  <Link to="/driver/profile">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Settings className="h-6 w-6 text-purple-600" />
                    </div>
                    Update Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="buses" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">My Buses</h2>
                <p className="text-muted-foreground mt-1">Manage your fleet and bus details</p>
              </div>
              <Button asChild className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 shadow-lg hover:shadow-xl transition-all duration-300">
                <Link to="/driver/add-bus">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bus
                </Link>
              </Button>
            </div>

            {buses.length === 0 ? (
              <Card className="bg-slate-50 border-slate-200 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-slate-200 rounded-full mb-4">
                    <Bus className="h-12 w-12 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-800">No buses registered</h3>
                  <p className="text-slate-600 text-center mb-6 max-w-md">
                    Add your first bus to start managing routes and bookings.
                  </p>
                  <Button asChild className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300">
                    <Link to="/driver/add-bus">Add Your First Bus</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {buses.map((bus) => (
                  <Card key={bus.id} className="bg-white border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-100 rounded-full">
                            <Bus className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold text-slate-800">{bus.bus_number}</CardTitle>
                            <Badge variant={bus.is_active ? "default" : "secondary"} className={`mt-2 ${bus.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}`}>
                              {bus.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="p-2 bg-purple-100 rounded-full">
                            <Bus className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Bus Type</p>
                            <p className="text-sm font-semibold text-slate-800">{bus.bus_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="p-2 bg-green-100 rounded-full">
                            <User className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Total Seats</p>
                            <p className="text-sm font-semibold text-slate-800">{bus.total_seats}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="p-2 bg-orange-100 rounded-full">
                            <MapPin className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Registration</p>
                            <p className="text-sm font-semibold text-slate-800">{bus.registration_number}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteBus(bus.id, bus.bus_number)}
                          disabled={deletingBusId === bus.id}
                          className="bg-red-100 hover:bg-red-200 text-red-800 border border-red-300"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Bus
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trips" className="space-y-6">
            {showTripWizard && selectedAssignment ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Bus className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Manage Trips for {selectedAssignment.busNumber}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedAssignment.routeName} &middot; {selectedAssignment.from} → {selectedAssignment.to}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => {
                    setShowTripWizard(false);
                    setSelectedAssignment(null);
                  }} className="border-slate-300 hover:bg-slate-50">
                    Cancel
                  </Button>
                </div>
                <TripWizard
                  route={{
                    id: selectedAssignment.routeId,
                    name: selectedAssignment.routeName,
                    from: selectedAssignment.from,
                    to: selectedAssignment.to,
                    busType: selectedAssignment.busType as BusType,
                    totalSeats: selectedAssignment.totalSeats,
                    trips: selectedAssignment.trips,
                  }}
                  bus={{
                    id: selectedAssignment.busId,
                    busNumber: selectedAssignment.busNumber,
                  }}
                  existingTrips={selectedAssignment.trips}
                  onSubmit={() => {
                    setShowTripWizard(false);
                    setSelectedAssignment(null);
                    setIsSubmittingTrip(false);
                    fetchDriverData();
                  }}
                  isSubmitting={isSubmittingTrip}
                />
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800">Manage Trips</h2>
                    <p className="text-sm text-muted-foreground">Select a bus to add or edit trips for that bus.</p>
                  </div>
                </div>

                {assignments.length === 0 ? (
                  <Card className="bg-slate-50 border-slate-200 shadow-lg">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <div className="p-4 bg-slate-200 rounded-full mb-4">
                        <Bus className="h-12 w-12 text-slate-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-slate-800">No Assigned Bus</h3>
                      <p className="text-slate-600 text-center mb-4 max-w-md">
                        Add a bus and assign a route first, then you can manage trips for that bus.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {assignments.map((assignment) => (
                      <Card key={assignment.busId} className="bg-white border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader>
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-green-100 rounded-full">
                                <Bus className="h-6 w-6 text-green-600" />
                              </div>
                              <div>
                                <CardTitle className="text-xl font-bold text-slate-800">{assignment.busNumber}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {assignment.routeName} &middot; {assignment.from} → {assignment.to}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => {
                                setSelectedAssignment(assignment);
                                setShowTripWizard(true);
                              }} className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300">
                                <Plus className="h-4 w-4 mr-2" />
                                Manage Trips
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteBus(assignment.busId, assignment.busNumber)}
                                disabled={deletingBusId === assignment.busId}
                                className="bg-red-100 hover:bg-red-200 text-red-800 border border-red-300"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Bus
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                              <div className="p-2 bg-green-100 rounded-full">
                                <MapPin className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-green-700">Route</p>
                                <p className="text-sm font-semibold text-green-800">{assignment.routeName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                              <div className="p-2 bg-blue-100 rounded-full">
                                <Calendar className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-blue-700">Trips</p>
                                <p className="text-sm font-semibold text-blue-800">{assignment.trips.length} scheduled</p>
                              </div>
                            </div>
                          </div>
                          {assignment.trips.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-slate-800 mb-3">Scheduled Trips</h4>
                              {assignment.trips.map((trip) => (
                                <div key={trip.id} className="rounded-lg border border-slate-200 p-4 bg-slate-50 hover:shadow-md transition-all duration-200">
                                  <div className="flex justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue-100 rounded-full">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <span className="font-medium text-slate-800">{trip.departureTime} → {trip.arrivalTime}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-lg font-bold text-green-600">₹{trip.price}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-green-100 rounded-full">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-800">Passenger Bookings</h2>
                <p className="text-muted-foreground">View and manage passenger bookings for your routes</p>
              </div>
            </div>

            {bookings.length === 0 ? (
              <Card className="bg-slate-50 border-slate-200 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-slate-200 rounded-full mb-4">
                    <Calendar className="h-12 w-12 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-800">No bookings found</h3>
                  <p className="text-slate-600 text-center max-w-md">
                    Bookings for your assigned routes will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {bookingsGroupedByBus.map((group) => (
                  <Card key={group.busId} className="bg-white border-slate-200 shadow-lg">
                    <CardHeader>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 rounded-full">
                            <Bus className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold text-slate-800">
                              Bus {group.busNumber}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {group.routeName}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                          {group.bookings.length} bookings
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {group.bookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No bookings for this bus yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {group.bookings.map((booking) => (
                            <div key={booking.id} className="rounded-xl border border-slate-200 p-6 bg-white hover:shadow-md transition-all duration-200">
                              <div className="flex justify-between items-start gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 rounded-full">
                                    <MapPin className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{booking.route_name}</h3>
                                    <p className="text-sm text-slate-600">
                                      {new Date(booking.date).toLocaleDateString()} • Seat {booking.seat_number}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  {booking.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                  <div className="p-2 bg-purple-100 rounded-full">
                                    <User className="h-4 w-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Passenger</p>
                                    <p className="text-sm font-semibold text-slate-800">{booking.passenger_name}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                  <div className="p-2 bg-green-100 rounded-full">
                                    <Phone className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contact</p>
                                    <p className="text-sm font-semibold text-slate-800">{booking.phone_number}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {otherBookings.length > 0 && (
                  <Card className="bg-orange-50 border-orange-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-orange-800 flex items-center gap-2">
                        <div className="p-2 bg-orange-500 rounded-full">
                          <Calendar className="h-5 w-5 text-white" />
                        </div>
                        Unassigned Bookings
                      </CardTitle>
                      <p className="text-sm text-orange-700">Bookings that are not matched to any active bus assignment.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {otherBookings.map((booking) => (
                        <div key={booking.id} className="rounded-xl border border-orange-200 p-6 bg-white">
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-orange-100 rounded-full">
                                <MapPin className="h-5 w-5 text-orange-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-orange-900 text-lg">{booking.route_name}</h3>
                                <p className="text-sm text-orange-700">
                                  {new Date(booking.date).toLocaleDateString()} • Seat {booking.seat_number}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                              <div className="p-2 bg-purple-100 rounded-full">
                                <User className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Passenger</p>
                                <p className="text-sm font-semibold text-orange-900">{booking.passenger_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                              <div className="p-2 bg-green-100 rounded-full">
                                <Phone className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Contact</p>
                                <p className="text-sm font-semibold text-orange-900">{booking.phone_number}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <User className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Driver Profile</h2>
                  <p className="text-muted-foreground">Manage your driver information and credentials</p>
                </div>
              </div>
              <Button asChild variant="outline" className="border-purple-300 hover:bg-purple-50">
                <Link to="/driver/profile">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            </div>

            {profile ? (
              <Card className="bg-white border-purple-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-purple-800">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <label className="text-sm font-bold text-blue-800 uppercase tracking-wide">License Number</label>
                      </div>
                      <p className="text-lg font-semibold text-blue-900 ml-11">{profile.license_number}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 rounded-full">
                          <Calendar className="h-4 w-4 text-green-600" />
                        </div>
                        <label className="text-sm font-bold text-green-800 uppercase tracking-wide">License Expiry</label>
                      </div>
                      <p className="text-lg font-semibold text-green-900 ml-11">{new Date(profile.license_expiry).toLocaleDateString()}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <Phone className="h-4 w-4 text-purple-600" />
                        </div>
                        <label className="text-sm font-bold text-purple-800 uppercase tracking-wide">Phone Number</label>
                      </div>
                      <p className="text-lg font-semibold text-purple-900 ml-11">{profile.phone_number}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-100 rounded-full">
                          <Settings className="h-4 w-4 text-orange-600" />
                        </div>
                        <label className="text-sm font-bold text-orange-800 uppercase tracking-wide">Experience</label>
                      </div>
                      <p className="text-lg font-semibold text-orange-900 ml-11">{profile.experience_years} years</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 md:col-span-2">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-100 rounded-full">
                          <Phone className="h-4 w-4 text-slate-600" />
                        </div>
                        <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">Emergency Contact</label>
                      </div>
                      <p className="text-lg font-semibold text-slate-900 ml-11">{profile.emergency_contact || 'Not provided'}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 md:col-span-2">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 rounded-full">
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                        </div>
                        <label className="text-sm font-bold text-green-800 uppercase tracking-wide">Verification Status</label>
                      </div>
                      <div className="ml-11">
                        <Badge variant={profile.is_verified ? "default" : "secondary"} className={`text-lg px-4 py-2 ${profile.is_verified ? 'bg-green-100 text-green-800 border border-green-300' : ''}`}>
                          {profile.is_verified ? 'Verified' : 'Pending Verification'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-50 border-slate-200 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-slate-200 rounded-full mb-4">
                    <User className="h-12 w-12 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-800">Profile not found</h3>
                  <p className="text-slate-600 text-center mb-6 max-w-md">
                    Complete your driver profile to start using the system.
                  </p>
                  <Button asChild className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300">
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