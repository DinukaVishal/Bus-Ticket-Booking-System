import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRoutes, useAddRoute } from '@/hooks/useRoutes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Bus, ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ViaPointsEditor from '@/components/admin/ViaPointsEditor';
import { BusType } from '@/types/booking';

interface BusFormData {
  busNumber: string;
  busType: string;
  totalSeats: string;
  registrationNumber: string;
  insuranceExpiry: string;
  fitnessCertificateExpiry: string;
}

interface StaffFormData {
  driverName: string;
  driverPhone: string;
  conductorName: string;
  conductorPhone: string;
}

const BusOwnerEditBus = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { busId } = useParams<{ busId: string }>();
  const { data: allRoutes = [] } = useRoutes();
  const addRouteMutation = useAddRoute();
  const queryClient = useQueryClient();
  const [isCreateRouteOpen, setIsCreateRouteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditStops, setShowEditStops] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedReturnRoute, setSelectedReturnRoute] = useState<string>('none');
  const [routeFormData, setRouteFormData] = useState({
    from: '',
    to: '',
    viaPoints: [] as string[],
  });
  const [originalViaPoints, setOriginalViaPoints] = useState<string[]>([]);

  const areViaPointsEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((point, index) => point === b[index]);

  const viaPointsChanged = !areViaPointsEqual(routeFormData.viaPoints, originalViaPoints);

  const getRouteName = (from: string, to: string) => {
    if (!from.trim() || !to.trim()) return '';
    return `${from.trim()} to ${to.trim()}`;
  };

  const routeViaPointsReverseMatch = (routePoints: string[] = [], candidatePoints: string[] = []) => {
    if (routePoints.length !== candidatePoints.length) return false;
    return routePoints.every((point, index) => point === candidatePoints[candidatePoints.length - 1 - index]);
  };

  const updateRouteForm = (field: 'from' | 'to' | 'viaPoints', value: string | string[]) => {
    setRouteFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateOwnerRoute = async () => {
    if (!routeFormData.from.trim() || !routeFormData.to.trim()) {
      toast({
        title: 'Missing route details',
        description: 'Please enter both start and end cities for the route.',
        variant: 'destructive',
      });
      return;
    }

    if (routeFormData.from.trim().toLowerCase() === routeFormData.to.trim().toLowerCase()) {
      toast({
        title: 'Invalid route',
        description: 'Start and end cities must be different.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const forwardRoute = await addRouteMutation.mutateAsync({
        name: getRouteName(routeFormData.from, routeFormData.to),
        from: routeFormData.from.trim(),
        to: routeFormData.to.trim(),
        departureTime: '08:00 AM',
        arrivalTime: null,
        price: 0,
        busType: 'normal' as BusType,
        totalSeats: 54,
        busNumber: null,
        driverName: null,
        driverPhone: null,
        conductorName: null,
        conductorPhone: null,
        viaPoints: routeFormData.viaPoints,
      });

      if (!forwardRoute?.id) {
        throw new Error('Failed to create route');
      }

      const reverseRouteName = getRouteName(routeFormData.to, routeFormData.from);
      const reverseViaPoints = [...routeFormData.viaPoints].reverse();

      let reverseRoute = allRoutes.find(route =>
        route.from === routeFormData.to.trim() &&
        route.to === routeFormData.from.trim() &&
        routeViaPointsReverseMatch(routeFormData.viaPoints, route.viaPoints || [])
      );

      if (!reverseRoute) {
        reverseRoute = await addRouteMutation.mutateAsync({
          name: reverseRouteName,
          from: routeFormData.to.trim(),
          to: routeFormData.from.trim(),
          departureTime: '08:00 AM',
          arrivalTime: null,
          price: 0,
          busType: 'normal' as BusType,
          totalSeats: 54,
          busNumber: null,
          driverName: null,
          driverPhone: null,
          conductorName: null,
          conductorPhone: null,
          viaPoints: reverseViaPoints,
        });
      }

      setSelectedRoute(forwardRoute.id);
      setSelectedReturnRoute(reverseRoute?.id || 'none');
      setRouteFormData({ from: '', to: '', viaPoints: [] });
      setIsCreateRouteOpen(false);
    } catch (error: any) {
      toast({
        title: 'Route creation failed',
        description: error.message || 'Could not create the route. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to find a matching return route
  const findReturnRoute = (primaryRouteId: string): string => {
    const primaryRoute = allRoutes.find(route => route.id === primaryRouteId);
    if (!primaryRoute) return 'none';

    const reversedViaPoints = [...(primaryRoute.viaPoints || [])].reverse();

    const exactReturnRoute = allRoutes.find(route =>
      route.from === primaryRoute.to &&
      route.to === primaryRoute.from &&
      route.viaPoints?.length === reversedViaPoints.length &&
      route.viaPoints?.every((point, index) => point === reversedViaPoints[index])
    );

    if (exactReturnRoute) return exactReturnRoute.id ?? 'none';

    const fallbackReturnRoute = allRoutes.find(route =>
      route.from === primaryRoute.to && route.to === primaryRoute.from
    );

    return fallbackReturnRoute ? fallbackReturnRoute.id ?? 'none' : 'none';
  };

  // Handle primary route selection and auto-set return route
  const handlePrimaryRouteChange = (routeId: string) => {
    setSelectedRoute(routeId);
    const returnRouteId = findReturnRoute(routeId);
    setSelectedReturnRoute(returnRouteId);
  };

  useEffect(() => {
    if (!selectedRoute) return;
    const returnRouteId = findReturnRoute(selectedRoute);
    setSelectedReturnRoute(returnRouteId);
  }, [selectedRoute, allRoutes]);

  // When primary route changes, load route details (from/to/viaPoints)
  useEffect(() => {
    const loadRouteDetails = async () => {
      if (!selectedRoute) return;
      try {
        const { data: routeDetails, error } = await supabase
          .from('routes')
          .select('id, name, from_city, to_city, via_points')
          .eq('id', selectedRoute)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (routeDetails) {
          const viaPoints = routeDetails.via_points || [];
          setRouteFormData({
            from: routeDetails.from_city || '',
            to: routeDetails.to_city || '',
            viaPoints,
          });
          setOriginalViaPoints(viaPoints);
        }
      } catch (err) {
        console.warn('Failed to load route details', err);
      }
    };

    loadRouteDetails();
  }, [selectedRoute]);
  const [busFormData, setBusFormData] = useState<BusFormData>({
    busNumber: '',
    busType: '',
    totalSeats: '',
    registrationNumber: '',
    insuranceExpiry: '',
    fitnessCertificateExpiry: '',
  });
  const [staffFormData, setStaffFormData] = useState<StaffFormData>({
    driverName: '',
    driverPhone: '',
    conductorName: '',
    conductorPhone: '',
  });

  useEffect(() => {
    if (busId && user?.id) {
      loadBus();
    }
  }, [busId, user?.id]);

  const loadBus = async () => {
    if (!busId || !user?.id) return;

    setIsLoading(true);

    try {
      const { data: busData, error: busError } = await supabase
        .from('owner_buses')
        .select('*')
        .eq('id', busId)
        .eq('bus_owner_id', user.id)
        .single();

      if (busError) throw busError;
      if (!busData) throw new Error('Bus not found');

      setBusFormData({
        busNumber: busData.bus_number,
        busType: busData.bus_type,
        totalSeats: String(busData.total_seats),
        registrationNumber: busData.registration_number,
        insuranceExpiry: busData.insurance_expiry?.slice(0, 10) ?? '',
        fitnessCertificateExpiry: busData.fitness_certificate_expiry?.slice(0, 10) ?? '',
      });

      const { data: routeData, error: routeError } = await supabase
        .from('owner_routes')
        .select('route_id')
        .eq('owner_bus_id', busId);

      if (routeError && routeError.code !== 'PGRST116') throw routeError;
      if (routeData && routeData.length > 0) {
        handlePrimaryRouteChange(routeData[0].route_id);
      }

      const { data: driverData, error: driverError } = await supabase
        .from('bus_drivers')
        .select('driver_name, driver_phone')
        .eq('bus_id', busId)
        .single();

      if (driverError && driverError.code !== 'PGRST116') throw driverError;

      const { data: conductorData, error: conductorError } = await supabase
        .from('bus_conductors')
        .select('conductor_name, conductor_phone')
        .eq('bus_id', busId)
        .single();

      if (conductorError && conductorError.code !== 'PGRST116') throw conductorError;

      setStaffFormData({
        driverName: driverData?.driver_name ?? '',
        driverPhone: driverData?.driver_phone ?? '',
        conductorName: conductorData?.conductor_name ?? '',
        conductorPhone: conductorData?.conductor_phone ?? '',
      });
    } catch (error: any) {
      toast({
        title: 'Unable to load bus',
        description: error.message || 'Could not fetch bus details.',
        variant: 'destructive',
      });
      navigate('/bus-owner/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrimaryRouteIdForBus = async (): Promise<string | undefined> => {
    if (!busId) return undefined;

    const { data, error } = await supabase
      .from('owner_routes')
      .select('route_id')
      .eq('owner_bus_id', busId)
      .limit(1);

    if (error && error.code !== 'PGRST116') throw error;
    return data?.[0]?.route_id;
  };

  const handleBusInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleStaffInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStaffFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update a bus.',
        variant: 'destructive',
      });
      return;
    }

    if (!busFormData.busNumber || !busFormData.busType || !busFormData.totalSeats ||
        !busFormData.registrationNumber || !busFormData.insuranceExpiry || !busFormData.fitnessCertificateExpiry ||
        !selectedRoute) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (!staffFormData.driverName || !staffFormData.driverPhone ||
        !staffFormData.conductorName || !staffFormData.conductorPhone) {
      toast({
        title: 'Missing Staff Information',
        description: 'Please fill in driver and conductor details.',
        variant: 'destructive',
      });
      return;
    }

    if (parseInt(busFormData.totalSeats) < 1) {
      toast({
        title: 'Invalid Seat Count',
        description: 'Total seats must be at least 1.',
        variant: 'destructive',
      });
      return;
    }

    if (!busId) {
      toast({
        title: 'Invalid Bus',
        description: 'No bus selected to update.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const normalizedBusNumber = busFormData.busNumber.trim().toUpperCase();

      const { data: duplicateBus, error: duplicateError } = await supabase
        .from('owner_buses')
        .select('id')
        .eq('bus_owner_id', user.id)
        .eq('bus_number', normalizedBusNumber)
        .neq('id', busId)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        throw duplicateError;
      }

      if (duplicateBus) {
        toast({
          title: 'Duplicate Bus Number',
          description: `A different bus with number ${normalizedBusNumber} already exists.`,
          variant: 'destructive',
        });
        return;
      }

      const { error: updateBusError } = await supabase
        .from('owner_buses')
        .update({
          bus_number: normalizedBusNumber,
          bus_type: busFormData.busType,
          total_seats: parseInt(busFormData.totalSeats),
          registration_number: busFormData.registrationNumber,
          insurance_expiry: busFormData.insuranceExpiry,
          fitness_certificate_expiry: busFormData.fitnessCertificateExpiry,
        })
        .eq('id', busId)
        .eq('bus_owner_id', user.id);

      if (updateBusError) throw updateBusError;

      // Update the routes table via_points for the selected primary route
      let effectiveReturnRoute = selectedReturnRoute && selectedReturnRoute !== 'none'
        ? selectedReturnRoute
        : undefined;

      let primaryRouteToUpdate = selectedRoute || await fetchPrimaryRouteIdForBus();
      if (!primaryRouteToUpdate) {
        throw new Error('No primary route is assigned to this bus.');
      }

      const { data: updatedRouteData, error: updateRouteError } = await supabase
        .from('routes')
        .update({ via_points: routeFormData.viaPoints })
        .eq('id', primaryRouteToUpdate)
        .select();

      if (updateRouteError) throw updateRouteError;
      if (!updatedRouteData || updatedRouteData.length === 0) {
        const fallbackRouteId = await fetchPrimaryRouteIdForBus();
        if (fallbackRouteId && fallbackRouteId !== primaryRouteToUpdate) {
          const { data: fallbackRouteData, error: fallbackRouteError } = await supabase
            .from('routes')
            .update({ via_points: routeFormData.viaPoints })
            .eq('id', fallbackRouteId)
            .select();

          if (fallbackRouteError) throw fallbackRouteError;
          if (!fallbackRouteData || fallbackRouteData.length === 0) {
            throw new Error('Primary route could not be updated.');
          }
          primaryRouteToUpdate = fallbackRouteId;
        } else {
          throw new Error('Primary route could not be updated.');
        }
      }

      if (!effectiveReturnRoute) {
        const { data: returnRouteData, error: returnRouteError } = await supabase
          .from('routes')
          .select('id')
          .eq('from_city', routeFormData.to)
          .eq('to_city', routeFormData.from)
          .limit(1);

        if (returnRouteError) throw returnRouteError;
        effectiveReturnRoute = returnRouteData?.[0]?.id;
      }

      if (effectiveReturnRoute && effectiveReturnRoute !== primaryRouteToUpdate) {
        const reversed = [...routeFormData.viaPoints].reverse();
        const { data: updatedReturnData, error: updateReturnError } = await supabase
          .from('routes')
          .update({ via_points: reversed })
          .eq('id', effectiveReturnRoute)
          .select();

        if (updateReturnError) throw updateReturnError;
        if (!updatedReturnData || updatedReturnData.length === 0) {
          throw new Error('Return route could not be updated.');
        }
      }

      const routeIds = [primaryRouteToUpdate, effectiveReturnRoute]
        .filter((routeId, index, arr) => routeId && routeId !== 'none' && arr.indexOf(routeId) === index);

      const { error: routeDeleteError } = await supabase
        .from('owner_routes')
        .delete()
        .eq('owner_bus_id', busId);

      if (routeDeleteError) throw routeDeleteError;

      if (routeIds.length > 0) {
        const routeInserts = routeIds.map((routeId) => ({
          bus_owner_id: user.id,
          route_id: routeId,
          owner_bus_id: busId,
          is_active: true,
        }));

        const { error: routeInsertError } = await supabase
          .from('owner_routes')
          .insert(routeInserts);

        if (routeInsertError) throw routeInsertError;
      }

      queryClient.invalidateQueries({ queryKey: ['routes'] });

      const { error: driverUpdateError } = await supabase
        .from('bus_drivers')
        .update({
          driver_name: staffFormData.driverName,
          driver_phone: staffFormData.driverPhone,
          is_active: true,
        })
        .eq('bus_id', busId);

      if (driverUpdateError && driverUpdateError.code !== 'PGRST116') {
        throw driverUpdateError;
      }

      if (driverUpdateError) {
        const { error: driverInsertError } = await supabase
          .from('bus_drivers')
          .insert({
            bus_owner_id: user.id,
            bus_id: busId,
            driver_name: staffFormData.driverName,
            driver_phone: staffFormData.driverPhone,
            is_active: true,
          });

        if (driverInsertError) throw driverInsertError;
      }

      const { error: conductorUpdateError } = await supabase
        .from('bus_conductors')
        .update({
          conductor_name: staffFormData.conductorName,
          conductor_phone: staffFormData.conductorPhone,
          is_active: true,
        })
        .eq('bus_id', busId);

      if (conductorUpdateError && conductorUpdateError.code !== 'PGRST116') {
        throw conductorUpdateError;
      }

      if (conductorUpdateError) {
        const { error: conductorInsertError } = await supabase
          .from('bus_conductors')
          .insert({
            bus_owner_id: user.id,
            bus_id: busId,
            conductor_name: staffFormData.conductorName,
            conductor_phone: staffFormData.conductorPhone,
            is_active: true,
          });

        if (conductorInsertError) throw conductorInsertError;
      }

      toast({
        title: 'Bus Updated',
        description: viaPointsChanged
          ? 'Your bus details and route stops have been saved successfully.'
          : 'Your bus details have been saved successfully.',
      });
      navigate('/bus-owner/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error Updating Bus',
        description: error.message || 'Could not update the bus.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
              <p className="text-muted-foreground">No bus selected for editing.</p>
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

      <main className="relative z-10 flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/bus-owner/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Bus className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Edit Bus</h1>
            <p className="text-muted-foreground">Update your bus, route, and staff details.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bus and Staff Management</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <Tabs defaultValue="bus" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="bus">Bus Details</TabsTrigger>
                  <TabsTrigger value="driver">Driver Info</TabsTrigger>
                  <TabsTrigger value="conductor">Conductor Info</TabsTrigger>
                </TabsList>

                <TabsContent value="bus" className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="route">Route for this Bus</Label>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateRouteOpen(true)}>
                          Create route
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEditStops((s) => !s)}
                        >
                          {showEditStops ? 'Hide stops' : 'Edit stops'}
                        </Button>
                      </div>
                    </div>

                    {selectedRoute ? (
                      <>
                        {viaPointsChanged && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 mb-4">
                            <p className="text-sm font-semibold text-emerald-900">Route stops changed</p>
                            <p className="text-sm text-emerald-700">
                              You have updated the intermediate stops for this route. These changes will be saved when you submit the form.
                            </p>
                          </div>
                        )}
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                          <p className="text-sm font-semibold text-foreground">Primary route</p>
                          <p className="text-sm text-muted-foreground">
                            {allRoutes.find(r => r.id === selectedRoute)?.name || 'Custom route'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {(routeFormData.from || allRoutes.find(r => r.id === selectedRoute)?.from) || ''} → {(routeFormData.to || allRoutes.find(r => r.id === selectedRoute)?.to) || ''}
                          </p>
                          {routeFormData.viaPoints?.length ? (
                            <p className="text-sm text-muted-foreground mt-2">
                              Intermediate stops: {routeFormData.viaPoints.join(' → ')}
                            </p>
                          ) : allRoutes.find(r => r.id === selectedRoute)?.viaPoints?.length ? (
                            <p className="text-sm text-muted-foreground mt-2">
                              Intermediate stops: {allRoutes.find(r => r.id === selectedRoute)?.viaPoints.join(' → ')}
                            </p>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        This bus must have a route assigned. Create a route and the reverse route will be created automatically.
                      </p>
                    )}

                    {selectedReturnRoute !== 'none' && (
                      <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
                        <p className="text-sm font-semibold text-foreground">Return route</p>
                        <p className="text-sm text-muted-foreground">
                          {allRoutes.find(r => r.id === selectedReturnRoute)?.name || 'Custom reverse route'}
                        </p>
                      </div>
                    )}
                    {/* Allow editing intermediate stops for the selected primary route */}
                    {selectedRoute && showEditStops && (
                      <div className="space-y-4">
                        <Label>Intermediate Stops (editable)</Label>
                        <div className="rounded-lg border border-white/10 bg-card p-4">
                          <ViaPointsEditor
                            viaPoints={routeFormData.viaPoints}
                            onChange={(viaPoints) => updateRouteForm('viaPoints', viaPoints)}
                            fromCity={routeFormData.from}
                            toCity={routeFormData.to}
                          />
                        </div>
                        {routeFormData.viaPoints?.length > 0 && (
                          <div className="rounded-lg border border-muted/20 bg-muted/10 p-4 text-sm text-muted-foreground">
                            <p className="font-semibold text-foreground mb-2">Current intermediate stops</p>
                            <p>{routeFormData.viaPoints.join(' → ')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Dialog open={isCreateRouteOpen} onOpenChange={setIsCreateRouteOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create a New Route</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="routeFrom">Start City</Label>
                            <Input
                              id="routeFrom"
                              value={routeFormData.from}
                              onChange={(e) => updateRouteForm('from', e.target.value)}
                              placeholder="From city"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="routeTo">End City</Label>
                            <Input
                              id="routeTo"
                              value={routeFormData.to}
                              onChange={(e) => updateRouteForm('to', e.target.value)}
                              placeholder="To city"
                            />
                          </div>
                        </div>

                        <ViaPointsEditor
                          viaPoints={routeFormData.viaPoints}
                          onChange={(viaPoints) => updateRouteForm('viaPoints', viaPoints)}
                          fromCity={routeFormData.from}
                          toCity={routeFormData.to}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsCreateRouteOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCreateOwnerRoute}
                          disabled={isLoading || !routeFormData.from || !routeFormData.to}
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Create Route'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="busNumber">Bus Number *</Label>
                      <Input
                        id="busNumber"
                        name="busNumber"
                        type="text"
                        placeholder="e.g., NB-1234"
                        value={busFormData.busNumber}
                        onChange={handleBusInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="busType">Bus Type *</Label>
                      <Select value={busFormData.busType} onValueChange={(value) => setBusFormData((prev) => ({ ...prev, busType: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bus type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rosa">Rosa</SelectItem>
                          <SelectItem value="luxury_ac">Luxury AC</SelectItem>
                          <SelectItem value="super_long">Super Long</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="totalSeats">Total Seats *</Label>
                      <Input
                        id="totalSeats"
                        name="totalSeats"
                        type="number"
                        min={1}
                        placeholder="45"
                        value={busFormData.totalSeats}
                        onChange={handleBusInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">Registration Number *</Label>
                      <Input
                        id="registrationNumber"
                        name="registrationNumber"
                        type="text"
                        placeholder="ABC-1234"
                        value={busFormData.registrationNumber}
                        onChange={handleBusInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="insuranceExpiry">Insurance Expiry *</Label>
                      <Input
                        id="insuranceExpiry"
                        name="insuranceExpiry"
                        type="date"
                        value={busFormData.insuranceExpiry}
                        onChange={handleBusInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fitnessCertificateExpiry">Fitness Certificate Expiry *</Label>
                      <Input
                        id="fitnessCertificateExpiry"
                        name="fitnessCertificateExpiry"
                        type="date"
                        value={busFormData.fitnessCertificateExpiry}
                        onChange={handleBusInputChange}
                        required
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="driver" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="driverName">Driver Name *</Label>
                      <Input
                        id="driverName"
                        name="driverName"
                        type="text"
                        placeholder="Driver Name"
                        value={staffFormData.driverName}
                        onChange={handleStaffInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="driverPhone">Driver Phone *</Label>
                      <Input
                        id="driverPhone"
                        name="driverPhone"
                        type="tel"
                        placeholder="0712345678"
                        value={staffFormData.driverPhone}
                        onChange={handleStaffInputChange}
                        required
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="conductor" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="conductorName">Conductor Name *</Label>
                      <Input
                        id="conductorName"
                        name="conductorName"
                        type="text"
                        placeholder="Conductor Name"
                        value={staffFormData.conductorName}
                        onChange={handleStaffInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conductorPhone">Conductor Phone *</Label>
                      <Input
                        id="conductorPhone"
                        name="conductorPhone"
                        type="tel"
                        placeholder="0712345678"
                        value={staffFormData.conductorPhone}
                        onChange={handleStaffInputChange}
                        required
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BusOwnerEditBus;
