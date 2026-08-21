import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Bus, Loader2, ArrowLeft, Save, MapPin, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ViaPointsEditor from '@/components/admin/ViaPointsEditor';
import { BusType } from '@/types/booking';

const BusOwnerAddBus = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { data: allRoutes = [] } = useRoutes();
  const addRouteMutation = useAddRoute();
  const [isCreateRouteOpen, setIsCreateRouteOpen] = useState(false);
  const [routeFormData, setRouteFormData] = useState({
    from: '',
    to: '',
    viaPoints: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedRouteName, setSelectedRouteName] = useState<string>('');
  const [selectedReturnRoute, setSelectedReturnRoute] = useState<string>('none');
  const [selectedReturnRouteName, setSelectedReturnRouteName] = useState<string>('');
  const [existingBusNumbers, setExistingBusNumbers] = useState<string[]>([]);
  const [busFormData, setBusFormData] = useState({
    busNumber: '',
    busType: '',
    totalSeats: '',
    registrationNumber: '',
    insuranceExpiry: '',
    fitnessCertificateExpiry: '',
  });
  const [staffFormData, setStaffFormData] = useState({
    driverName: '',
    driverPhone: '',
    conductorName: '',
    conductorPhone: '',
  });

  const handleBusInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleStaffInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStaffFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setBusFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateRouteForm = (field: 'from' | 'to' | 'viaPoints', value: string | string[]) => {
    setRouteFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getRouteName = (from: string, to: string) => {
    if (!from.trim() || !to.trim()) return '';
    return `${from.trim()} to ${to.trim()}`;
  };

  const routeViaPointsReverseMatch = (routePoints: string[] = [], candidatePoints: string[] = []) => {
    if (routePoints.length !== candidatePoints.length) return false;
    return routePoints.every((point, index) => point === candidatePoints[candidatePoints.length - 1 - index]);
  };

  const findReturnRoute = (primaryRouteId: string): string => {
    const primaryRoute = allRoutes.find(route => route.id === primaryRouteId);
    if (!primaryRoute) return 'none';

    const returnRoute = allRoutes.find(route =>
      route.from === primaryRoute.to &&
      route.to === primaryRoute.from &&
      routeViaPointsReverseMatch(primaryRoute.viaPoints || [], route.viaPoints || [])
    );

    return returnRoute ? returnRoute.id : 'none';
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
      setSelectedRouteName(forwardRoute.name || getRouteName(routeFormData.from, routeFormData.to));
      setSelectedReturnRoute(reverseRoute?.id || 'none');
      setSelectedReturnRouteName(reverseRoute?.name || reverseRouteName);
      setRouteFormData({
        from: (forwardRoute as any).from_city || routeFormData.from,
        to: (forwardRoute as any).to_city || routeFormData.to,
        viaPoints: (forwardRoute as any).via_points || routeFormData.viaPoints || [],
      });
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

  useEffect(() => {
    const fetchExistingBusNumbers = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('owner_buses')
        .select('bus_number')
        .eq('bus_owner_id', user.id)
        .order('bus_number', { ascending: true });

      if (error) {
        toast({
          title: 'Unable to load your buses',
          description: error.message || 'Could not fetch existing bus numbers.',
          variant: 'destructive',
        });
        return;
      }

      setExistingBusNumbers(data?.map(item => item.bus_number) ?? []);
    };

    fetchExistingBusNumbers();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add a bus.',
        variant: 'destructive',
      });
      return;
    }

    // Validation
    if (!busFormData.busNumber || !busFormData.busType || !busFormData.totalSeats ||
        !busFormData.registrationNumber || !busFormData.insuranceExpiry || !busFormData.fitnessCertificateExpiry ||
        !selectedRoute) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required bus fields including selecting a route.',
        variant: 'destructive',
      });
      return;
    }

    if (!staffFormData.driverName || !staffFormData.driverPhone ||
        !staffFormData.conductorName || !staffFormData.conductorPhone) {
      toast({
        title: 'Missing Staff Information',
        description: 'Please fill in driver and conductor names and phone numbers.',
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

    setIsLoading(true);

    try {
      const newBusNumber = busFormData.busNumber.trim().toUpperCase();

      // Check if a bus with this number already exists for this user
      const { data: existingBus, error: checkError } = await supabase
        .from('owner_buses')
        .select('id')
        .eq('bus_owner_id', user.id)
        .eq('bus_number', newBusNumber)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows" error, which is expected
        throw checkError;
      }

      if (existingBus) {
        toast({
          title: 'Duplicate Bus Number',
          description: `A bus with number ${newBusNumber} already exists in your fleet.`,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Generate unique staff access code
      const generateAccessCode = () => {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
      };

      let accessCode = generateAccessCode();
      
      // Ensure uniqueness
      let existingCode;
      do {
        const { data } = await supabase
          .from('owner_buses')
          .select('id')
          .eq('staff_access_code', accessCode)
          .single();
        existingCode = data;
        if (existingCode) {
          accessCode = generateAccessCode();
        }
      } while (existingCode);

      // Insert the bus
      const { data: busData, error: busError } = await supabase
        .from('owner_buses')
        .insert({
          bus_owner_id: user.id,
          bus_number: newBusNumber,
          bus_type: busFormData.busType,
          total_seats: parseInt(busFormData.totalSeats),
          registration_number: busFormData.registrationNumber,
          insurance_expiry: busFormData.insuranceExpiry,
          fitness_certificate_expiry: busFormData.fitnessCertificateExpiry,
          is_active: false,
          staff_access_code: accessCode,
        })
        .select();

      if (busError) throw busError;

      if (!busData || busData.length === 0) {
        throw new Error('Failed to create bus');
      }

      const busId = busData[0].id;

      // Create owner_routes record to link bus to route
      const routeIds = [selectedRoute, selectedReturnRoute === 'none' ? '' : selectedReturnRoute].filter(
        (routeId, index, arr) => routeId && arr.indexOf(routeId) === index
      );

      if (routeIds.length > 0) {
        const routeInserts = routeIds.map((routeId) => ({
          bus_owner_id: user.id,
          route_id: routeId,
          owner_bus_id: busId,
          is_active: true,
        }));

        const { error: routeError } = await supabase
          .from('owner_routes')
          .insert(routeInserts);

        if (routeError) throw routeError;

        // Update the public routes table with the bus type so it displays correctly in booking
        for (const routeId of routeIds) {
          const { error: updateError } = await supabase
            .from('routes')
            .update({ bus_type: busFormData.busType })
            .eq('id', routeId);

          if (updateError) {
            console.warn('Warning: Could not update route bus type:', updateError);
            // Don't throw - this is non-critical
          }
        }
      }

      // Add driver information
      const { error: driverError } = await supabase
        .from('bus_drivers')
        .insert({
          bus_owner_id: user.id,
          bus_id: busId,
          driver_name: staffFormData.driverName,
          driver_phone: staffFormData.driverPhone,
          is_active: true,
        });

      if (driverError) throw driverError;

      // Add conductor information
      const { error: conductorError } = await supabase
        .from('bus_conductors')
        .insert({
          bus_owner_id: user.id,
          bus_id: busId,
          conductor_name: staffFormData.conductorName,
          conductor_phone: staffFormData.conductorPhone,
          is_active: true,
        });

      if (conductorError) throw conductorError;

      toast({
        title: 'Bus Added Successfully',
        description: 'Your bus and staff details have been registered. The bus is pending admin verification.',
      });

      navigate('/bus-owner/dashboard');

    } catch (error: any) {
      toast({
        title: 'Error Adding Bus',
        description: error.message || 'Failed to add bus. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen page-shell page-bg bg-fixed booking-blur text-foreground">
      <Header />
      <div className="absolute inset-0 pointer-events-none bg-black/10 backdrop-blur-lg" />

      <main className="relative z-10 flex-1 container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Add New Bus</h1>
            <p className="text-muted-foreground">Register your bus with driver and conductor details</p>
          </div>
        </div>

        {existingBusNumbers.length > 0 && (
          <div className="mb-6 rounded-lg border border-muted/30 bg-muted/10 p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Existing buses in your fleet</p>
            <div className="flex flex-wrap gap-2">
              {existingBusNumbers.map((busNumber) => (
                <span key={busNumber} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {busNumber}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Form with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Bus and Staff Registration</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <Tabs defaultValue="bus" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="bus">Bus Details</TabsTrigger>
                  <TabsTrigger value="driver">Driver Info</TabsTrigger>
                  <TabsTrigger value="conductor">Conductor Info</TabsTrigger>
                </TabsList>

                {/* Bus Details Tab */}
                <TabsContent value="bus" className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="route">Create Route for this Bus</Label>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateRouteOpen(true)}>
                        Create route
                      </Button>
                    </div>
                    {selectedRoute ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <p className="text-sm font-semibold text-foreground">Route created</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRouteName || allRoutes.find(r => r.id === selectedRoute)?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {allRoutes.find(r => r.id === selectedRoute)?.from || routeFormData.from} → {allRoutes.find(r => r.id === selectedRoute)?.to || routeFormData.to}
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
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        You must create a new route before submitting this bus. The return route will be created automatically in reverse order.
                      </p>
                    )}
                  </div>

                  {selectedReturnRoute !== 'none' && (
                    <div className="space-y-2">
                      <Label>Return Route</Label>
                      <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
                        <p className="text-sm font-semibold text-foreground">Reverse route created</p>
                        <p className="text-sm text-muted-foreground">{selectedReturnRouteName || allRoutes.find(r => r.id === selectedReturnRoute)?.name}</p>
                      </div>
                    </div>
                  )}

                  <Dialog open={isCreateRouteOpen} onOpenChange={setIsCreateRouteOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create a New Route</DialogTitle>
                        <DialogDescription>
                          Enter start and end cities, then add intermediate stops in order from start to end.
                        </DialogDescription>
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
                      <DialogFooter className="pt-4">
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
                      </DialogFooter>
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
                      <Select value={busFormData.busType} onValueChange={(value) => handleSelectChange('busType', value)}>
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
                        placeholder="e.g., 54"
                        value={busFormData.totalSeats}
                        onChange={handleBusInputChange}
                        min="1"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">Registration Number *</Label>
                      <Input
                        id="registrationNumber"
                        name="registrationNumber"
                        type="text"
                        placeholder="e.g., ABC-1234"
                        value={busFormData.registrationNumber}
                        onChange={handleBusInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="insuranceExpiry">Insurance Expiry Date *</Label>
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

                {/* Driver Info Tab */}
                <TabsContent value="driver" className="space-y-6">
                  <div className="flex items-start gap-2 p-3 bg-blue/5 border border-blue/20 rounded-lg mb-4">
                    <User className="w-5 h-5 text-blue mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Driver Information</p>
                      <p className="text-sm text-muted-foreground">Enter the driver details for this bus</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driverName">Driver Name *</Label>
                    <Input
                      id="driverName"
                      name="driverName"
                      type="text"
                      placeholder="Enter driver's full name"
                      value={staffFormData.driverName}
                      onChange={handleStaffInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driverPhone">Driver Phone Number *</Label>
                    <Input
                      id="driverPhone"
                      name="driverPhone"
                      type="tel"
                      placeholder="Enter driver's phone number"
                      value={staffFormData.driverPhone}
                      onChange={handleStaffInputChange}
                      required
                    />
                  </div>
                </TabsContent>

                {/* Conductor Info Tab */}
                <TabsContent value="conductor" className="space-y-6">
                  <div className="flex items-start gap-2 p-3 bg-pink/5 border border-pink/20 rounded-lg mb-4">
                    <User className="w-5 h-5 text-pink mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Conductor Information</p>
                      <p className="text-sm text-muted-foreground">Enter the conductor details for this bus</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conductorName">Conductor Name *</Label>
                    <Input
                      id="conductorName"
                      name="conductorName"
                      type="text"
                      placeholder="Enter conductor's full name"
                      value={staffFormData.conductorName}
                      onChange={handleStaffInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conductorPhone">Conductor Phone Number *</Label>
                    <Input
                      id="conductorPhone"
                      name="conductorPhone"
                      type="tel"
                      placeholder="Enter conductor's phone number"
                      value={staffFormData.conductorPhone}
                      onChange={handleStaffInputChange}
                      required
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Important Notes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All information must be accurate and up-to-date</li>
                  <li>• Your bus will be reviewed by administrators before activation</li>
                  <li>• Ensure insurance and fitness certificates are valid</li>
                  <li>• You can only add buses that you own or operate</li>
                  <li>• Driver and conductor details can be updated later</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/bus-owner/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding Bus...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Add Bus
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BusOwnerAddBus;
