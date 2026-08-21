import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useAuthContext } from '@/contexts/AuthContext';
import TripWizard from '@/components/driver/TripWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Bus, Plus, Edit, Trash2 } from 'lucide-react';
import { Route, Trip } from '@/types/booking';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const BusOwnerAddTrips = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { busId } = useParams<{ busId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [route, setRoute] = useState<Route | null>(null);
  const [assignedRoutes, setAssignedRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [busNumber, setBusNumber] = useState<string>('');
  const [busType, setBusType] = useState<string>('normal');
  const [totalSeats, setTotalSeats] = useState<number>(54);
  const [allTrips, setAllTrips] = useState<(Trip & { routeId?: string })[]>([]);
  const [existingTrips, setExistingTrips] = useState<Trip[]>([]);
  const [showTripWizard, setShowTripWizard] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [driverName, setDriverName] = useState<string>('');
  const [conductorName, setConductorName] = useState<string>('');

  const loadTripData = useCallback(async () => {
    if (!busId || !user?.id) return;

    setIsLoading(true);

    try {
      const { data: busData, error: busError } = await supabase
        .from('owner_buses')
        .select('bus_number, bus_type, total_seats')
        .eq('id', busId)
        .eq('bus_owner_id', user.id)
        .single();

      if (busError) throw busError;
      if (!busData) throw new Error('Bus not found.');

      setBusNumber(busData.bus_number);
      setBusType(busData.bus_type);
      setTotalSeats(busData.total_seats);

      const { data: ownerRoutesData, error: ownerRouteError } = await supabase
        .from('owner_routes')
        .select('route_id, routes(name, from_city, to_city, departure_time, price, via_points)')
        .eq('owner_bus_id', busId);

      if (ownerRouteError) throw ownerRouteError;
      if (!ownerRoutesData || ownerRoutesData.length === 0) throw new Error('Route not found for this bus.');

      const routes = ownerRoutesData.map((row: any) => ({
        id: row.route_id,
        name: row.routes.name,
        from: row.routes.from_city,
        to: row.routes.to_city,
        departureTime: row.routes.departure_time,
        price: row.routes.price,
        busType: busData.bus_type,
        totalSeats: busData.total_seats,
        trips: [],
        viaPoints: row.routes.via_points || [],
      }));

      setAssignedRoutes(routes);
      setSelectedRouteId(routes[0].id);
      setRoute(routes[0]);

      const routeIds = routes.map((route) => route.id);
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('id, route_id, departure_time, arrival_time, price, bus_number, driver_name, driver_phone, conductor_name, conductor_phone, via_stop_arrival_times')
        .in('route_id', routeIds);

      if (tripsError) throw tripsError;

      const mappedTrips = (tripsData || []).map((trip: any) => ({
        id: trip.id,
        departureTime: trip.departure_time,
        arrivalTime: trip.arrival_time || undefined,
        price: trip.price,
        busNumber: trip.bus_number || busData.bus_number,
        driverName: trip.driver_name || undefined,
        driverPhone: trip.driver_phone || undefined,
        conductorName: trip.conductor_name || undefined,
        conductorPhone: trip.conductor_phone || undefined,
        stopArrivalTimes: trip.via_stop_arrival_times || [],
        routeId: trip.route_id,
      }));

      setAllTrips(mappedTrips);
      setExistingTrips(mappedTrips.filter((trip) => trip.routeId === routes[0].id));

      const { data: driverData, error: driverError } = await supabase
        .from('bus_drivers')
        .select('driver_name')
        .eq('bus_id', busId)
        .single();

      if (driverError && driverError.code !== 'PGRST116') throw driverError;
      if (driverData?.driver_name) setDriverName(driverData.driver_name);

      const { data: conductorData, error: conductorError } = await supabase
        .from('bus_conductors')
        .select('conductor_name')
        .eq('bus_id', busId)
        .single();

      if (conductorError && conductorError.code !== 'PGRST116') throw conductorError;
      if (conductorData?.conductor_name) setConductorName(conductorData.conductor_name);
    } catch (error: any) {
      toast({
        title: 'Unable to load trips',
        description: error.message || 'Could not load trip data for this bus.',
        variant: 'destructive',
      });
      navigate('/bus-owner/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [busId, user?.id, navigate]);

  useEffect(() => {
    if (!busId || !user?.id) {
      setIsLoading(false);
      return;
    }

    loadTripData();
  }, [busId, user?.id, loadTripData]);

  useEffect(() => {
    if (!selectedRouteId) {
      setExistingTrips([]);
      setRoute(null);
      return;
    }

    const selected = assignedRoutes.find((routeItem) => routeItem.id === selectedRouteId);
    if (selected) {
      setRoute(selected);
      setExistingTrips(allTrips.filter((trip) => trip.routeId === selectedRouteId));
    }
  }, [selectedRouteId, assignedRoutes, allTrips]);

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      toast({
        title: 'Trip deleted',
        description: 'The trip has been successfully deleted.',
      });

      loadTripData();
    } catch (error: any) {
      toast({
        title: 'Error deleting trip',
        description: error.message || 'Failed to delete the trip.',
        variant: 'destructive',
      });
    }
  };

  if (!busId) {
    return (
      <div className="min-h-screen page-shell page-bg bg-fixed booking-blur text-foreground">
        <Header />
        <div className="absolute inset-0 pointer-events-none bg-black/10 backdrop-blur-lg" />

        <main className="relative z-10 flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center">
              <p className="text-muted-foreground">No bus selected for adding trips.</p>
              <Button onClick={() => navigate('/bus-owner/dashboard')} className="mt-4">
                Back to dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-shell page-bg bg-fixed booking-blur text-foreground">
      <Header />
      <div className="absolute inset-0 pointer-events-none bg-black/10 backdrop-blur-lg" />

      <main className="relative z-10 flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Add Trips</h1>
            <p className="text-muted-foreground">Schedule trips for your bus’s assigned route.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/bus-owner/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {isLoading || !route ? (
          <div className="rounded-lg border border-muted/30 bg-muted/10 p-8 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading bus and route data...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Bus: {busNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-lg border border-muted/20 bg-muted/10 p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Route</p>
                  {assignedRoutes.length > 1 ? (
                    <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a route to schedule trips" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignedRoutes.map((assignedRoute) => (
                          <SelectItem key={assignedRoute.id} value={assignedRoute.id}>
                            {assignedRoute.name} ({assignedRoute.from} → {assignedRoute.to})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div>
                      <p className="font-semibold">{route?.name}</p>
                      <p className="text-sm text-muted-foreground">{route?.from} → {route?.to}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bus Type</p>
                  <p className="font-semibold capitalize">{busType.replace('_', ' ')}</p>
                </div>
              </div>

              {showTripWizard ? (
                <TripWizard
                  route={route}
                  bus={{ id: busId, busNumber }}
                  existingTrips={editingTrip ? [editingTrip] : []}
                  defaultDriverName={driverName}
                  defaultConductorName={conductorName}
                  disableStaffFields={Boolean(driverName && conductorName)}
                  includeBusId={true}
                  isOwnerBus={true}
                  isSubmitting={false}
                  onSubmit={() => {
                    setShowTripWizard(false);
                    setEditingTrip(null);
                    loadTripData();
                  }}
                  onCancel={() => {
                    setShowTripWizard(false);
                    setEditingTrip(null);
                  }}
                />
              ) : (
                <div className="space-y-6">
                  {/* Existing Trips List */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Existing Trips</h3>
                      <Button onClick={() => setShowTripWizard(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Trip
                      </Button>
                    </div>

                    {existingTrips.length === 0 ? (
                      <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <div className="p-4 bg-gray-100 rounded-full mb-4">
                            <Bus className="h-8 w-8 text-gray-500" />
                          </div>
                          <h4 className="text-lg font-medium mb-2">No trips scheduled</h4>
                          <p className="text-muted-foreground text-center mb-4">
                            This route doesn't have any scheduled trips yet.
                          </p>
                          <Button onClick={() => setShowTripWizard(true)} variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Trip
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {existingTrips.map((trip) => (
                          <Card key={trip.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-100 rounded-full">
                                      <Bus className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-lg">
                                        {trip.departureTime} → {trip.arrivalTime || 'TBA'}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Bus: {trip.busNumber || busNumber}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2 text-sm">
                                    <span className="font-medium text-green-600">LKR {trip.price.toLocaleString()}</span>
                                    {trip.driverName && (
                                      <span className="text-muted-foreground">
                                        Driver: {trip.driverName}
                                      </span>
                                    )}
                                    {trip.conductorName && (
                                      <span className="text-muted-foreground">
                                        Conductor: {trip.conductorName}
                                      </span>
                                    )}
                                    {route?.viaPoints?.length ? (
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground text-xs font-medium">Intermediate Stops</p>
                                        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                                          {route.viaPoints.map((stop, idx) => (
                                            <div key={stop} className="flex justify-between gap-2">
                                              <span>{stop}</span>
                                              <span>{trip.stopArrivalTimes?.[idx] || 'Not set'}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingTrip(trip);
                                      setShowTripWizard(true);
                                    }}
                                    className="border-blue-200 hover:bg-blue-50"
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteTrip(trip.id)}
                                    className="border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default BusOwnerAddTrips;
