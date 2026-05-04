import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRoutes, useAddRoute } from '@/hooks/useRoutes';
import { useBookings, useUpdateBookingStatus } from '@/hooks/useBookings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  LayoutDashboard, 
  XCircle, 
  Search, 
  Loader2, 
  QrCode,
  Trash2,
  RefreshCw,
  Ticket,
  CheckCircle,
  Route as RouteIcon,
  Users,
  Bus as BusIcon,
  Check,
  X
} from 'lucide-react';
import RouteCard from '@/components/admin/RouteCard';
import RouteFormWizard from '@/components/admin/RouteFormWizard';
import { Route, BusType } from '@/types/booking';
import RouteMap from '@/components/booking/RouteMap';
import IncomeChart from '@/components/admin/IncomeChart';

const Admin = () => {
  const navigate = useNavigate();
  const { data: routes = [], isLoading: routesLoading } = useRoutes();
  const { data: bookings = [], isLoading: bookingsLoading, refetch } = useBookings();
  const updateStatusMutation = useUpdateBookingStatus();
  const addRouteMutation = useAddRoute();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [selectedRouteForMap, setSelectedRouteForMap] = useState<Route | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);

  // Fetch drivers and buses on mount
  const fetchDriversAndBuses = async () => {
    try {
      setDriversLoading(true);
      
      // Fetch drivers with their profiles
      const { data: driverData, error: driverError } = await supabase
        .from('driver_profiles')
        .select('id, user_id, license_number, is_verified, phone_number');
      
      if (driverError) throw driverError;
      setDrivers(driverData || []);

      // Fetch buses
      const { data: busData, error: busError } = await supabase
        .from('driver_buses')
        .select('id, driver_user_id, bus_number, bus_type, total_seats, is_approved, created_at')
        .order('created_at', { ascending: false });
      
      if (busError) throw busError;

      // Fetch driver route assignments with route details
      const { data: routeLinks, error: routeError } = await supabase
        .from('driver_routes')
        .select('bus_id, route_id, is_active, routes(id, name, from_city, to_city)');

      if (routeError) throw routeError;

      const routeMap = (routeLinks || []).reduce((acc: Record<string, any>, entry: any) => {
        acc[entry.bus_id] = entry;
        return acc;
      }, {});

      const enrichedBuses = (busData || []).map((bus: any) => {
        const routeEntry = routeMap[bus.id];
        const route = routeEntry?.routes;
        return {
          ...bus,
          assignedRoute: route
            ? {
                ...route,
                from: route.from_city,
                to: route.to_city,
              }
            : null,
          routeActive: routeEntry?.is_active ?? false,
        };
      });

      setBuses(enrichedBuses);
    } catch (error) {
      console.error('Error fetching drivers and buses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load drivers and buses.',
        variant: 'destructive',
      });
    } finally {
      setDriversLoading(false);
    }
  };

  useEffect(() => {
    fetchDriversAndBuses();
  }, []);

  // --- 1. GROUPING LOGIC ---
  const groupedBookings = useMemo(() => {
    const grouped = bookings.reduce((acc: any, curr: any) => {
      // Split ID by '-' and take the first part (BK538632-1 -> BK538632)
      const baseId = curr.id.split('-')[0];

      if (!acc[baseId]) {
        acc[baseId] = {
          ...curr,
          baseId, 
          seats: [curr.seatNumber],
          dbIds: [curr.id] 
        };
      } else {
        if (!acc[baseId].seats.includes(curr.seatNumber)) {
          acc[baseId].seats.push(curr.seatNumber);
          acc[baseId].dbIds.push(curr.id);
        }
      }
      return acc;
    }, {});
    return Object.values(grouped);
  }, [bookings]);

  // --- 2. DELETE FUNCTION ---
  const handleDeleteBooking = async (baseId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .like('booking_id', `${baseId}%`); 

      if (error) throw error;

      toast({ 
        title: 'Success!', 
        description: `Booking ${baseId} deleted successfully.` 
      });
      refetch(); 
    } catch (error: any) {
      console.error('Delete Error:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to delete booking.', 
        variant: 'destructive' 
      });
    }
  };

  const handleStatusChange = async (baseId: string, newStatus: 'confirmed' | 'cancelled', dbIds: string[]) => {
    try {
      await Promise.all(dbIds.map(id => updateStatusMutation.mutateAsync({ bookingId: id, status: newStatus })));
      toast({ title: 'Status Updated', description: `Booking status changed to ${newStatus}.` });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update status.', variant: 'destructive' });
    }
  };

  const verifyDriver = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({ 
          is_verified: true,
          verification_date: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Driver Verified',
        description: 'Driver account has been verified successfully.',
      });

      fetchDriversAndBuses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify driver.',
        variant: 'destructive',
      });
    }
  };

  const rejectDriver = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('driver_profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Driver Rejected',
        description: 'Driver application has been rejected.',
      });

      fetchDriversAndBuses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject driver.',
        variant: 'destructive',
      });
    }
  };

  const approveBus = async (busId: string) => {
    try {
      const bus = buses.find(b => b.id === busId);
      if (!bus) throw new Error('Bus not found');

      // Approve the bus
      const { error: busError } = await supabase
        .from('driver_buses')
        .update({ 
          is_approved: true,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approval_date: new Date().toISOString()
        })
        .eq('id', busId);

      if (busError) throw busError;

      // Activate the driver_routes record
      const { error: routeError } = await supabase
        .from('driver_routes')
        .update({ is_active: true })
        .eq('bus_id', busId);

      if (routeError) throw routeError;

      toast({
        title: 'Bus Approved',
        description: 'Bus has been approved and is now active.',
      });

      fetchDriversAndBuses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve bus.',
        variant: 'destructive',
      });
    }
  };

  const rejectBus = async (busId: string) => {
    try {
      // Delete the bus and its routes
      const { error: routeError } = await supabase
        .from('driver_routes')
        .delete()
        .eq('bus_id', busId);

      if (routeError) throw routeError;

      const { error: busError } = await supabase
        .from('driver_buses')
        .delete()
        .eq('id', busId);

      if (busError) throw busError;

      toast({
        title: 'Bus Rejected',
        description: 'Bus application has been rejected.',
      });

      fetchDriversAndBuses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject bus.',
        variant: 'destructive',
      });
    }
  };

  const filteredBookings = (groupedBookings as any[]).filter(
    (b) =>
      b.baseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.passengerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((b) => b.status === 'confirmed').length,
    cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
    totalRoutes: routes.length,
  };

  const isLoading = routesLoading || bookingsLoading || driversLoading;

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl pb-10 relative overflow-hidden">
      <Header />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]">
        <div className="absolute left-6 top-8 w-44 h-44 rounded-full bg-primary/10 blur-3xl animate-blob" />
        <div className="absolute right-6 top-24 w-56 h-56 rounded-full bg-accent/15 blur-3xl animate-blob delay-2000" />
        <div className="absolute left-1/2 top-10 w-72 h-72 -translate-x-1/2 rounded-full bg-secondary/15 blur-3xl animate-blob delay-4000" />
      </div>
      <main className="container mx-auto px-4 py-8 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-slide-up">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-display font-bold">Admin Dashboard</h1>
          </div>
          <Button onClick={() => navigate('/scan')} size="lg" className="shadow-lg hover:scale-105 transition-all">
            <QrCode className="w-5 h-5 mr-2" /> Scan Tickets
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="floating-window hover-card p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalBookings}</p>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                  </div>
                </div>
              </div>
              <div className="floating-window hover-card p-6 border-l-4 border-green-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-seat-available/10 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-seat-available" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.confirmedBookings}</p>
                    <p className="text-sm text-muted-foreground">Confirmed</p>
                  </div>
                </div>
              </div>
              <div className="floating-window hover-card p-6 border-l-4 border-red-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.cancelledBookings}</p>
                    <p className="text-sm text-muted-foreground">Cancelled</p>
                  </div>
                </div>
              </div>
              <div className="floating-window hover-card p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <RouteIcon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalRoutes}</p>
                    <p className="text-sm text-muted-foreground">Routes</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Tabs defaultValue="bookings" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3 rounded-3xl border border-border/70 bg-white/80 shadow-sm p-1">
                    <TabsTrigger value="drivers" className="transition-all duration-200">
                      <Users className="w-4 h-4 mr-2" />
                      Drivers
                    </TabsTrigger>
                    <TabsTrigger value="buses">
                      <BusIcon className="w-4 h-4 mr-2" />
                      Buses
                    </TabsTrigger>
                    <TabsTrigger value="bookings">
                      <Ticket className="w-4 h-4 mr-2" />
                      Bookings
                    </TabsTrigger>
                  </TabsList>

                  {/* Drivers Tab */}
                  <TabsContent value="drivers" className="space-y-4">
                    <div className="floating-window hover-card overflow-hidden border">
                      <div className="p-6 border-b">
                        <h2 className="text-lg font-bold">Pending Driver Verification</h2>
                        <p className="text-sm text-muted-foreground mt-1">Review and verify driver applications</p>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>License #</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {drivers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                  <p className="text-muted-foreground">No drivers to verify</p>
                                </TableCell>
                              </TableRow>
                            ) : (
                              drivers.map((driver) => (
                                <TableRow key={driver.id} className="transition-colors hover:bg-muted/70">
                                  <TableCell className="font-mono">{driver.license_number}</TableCell>
                                  <TableCell>{driver.phone_number}</TableCell>
                                  <TableCell>
                                    <Badge variant={driver.is_verified ? 'default' : 'secondary'}>
                                      {driver.is_verified ? 'Verified' : 'Pending'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {!driver.is_verified ? (
                                      <div className="flex justify-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => verifyDriver(driver.user_id)}
                                          className="text-green-600 hover:text-green-700"
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => rejectDriver(driver.user_id)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Badge>Verified</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Buses Tab */}
                  <TabsContent value="buses" className="space-y-4">
                    <div className="floating-window hover-card overflow-hidden border">
                      <div className="p-6 border-b">
                        <h2 className="text-lg font-bold">Pending Bus Approval</h2>
                        <p className="text-sm text-muted-foreground mt-1">Review and approve bus registrations</p>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Bus Number</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Seats</TableHead>
                              <TableHead>Route</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {buses.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                  <p className="text-muted-foreground">No buses pending approval</p>
                                </TableCell>
                              </TableRow>
                            ) : (
                              buses.map((bus) => (
                                <TableRow key={bus.id} className="transition-colors hover:bg-muted/70">
                                  <TableCell className="font-mono font-semibold">{bus.bus_number}</TableCell>
                                  <TableCell className="capitalize">{bus.bus_type.replace('_', ' ')}</TableCell>
                                  <TableCell>{bus.total_seats}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {bus.assignedRoute ? `${bus.assignedRoute.name} (${bus.assignedRoute.from} → ${bus.assignedRoute.to})` : 'Not assigned'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={bus.is_approved ? 'default' : 'secondary'}>
                                      {bus.is_approved ? 'Approved' : 'Pending'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {!bus.is_approved ? (
                                      <div className="flex justify-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => approveBus(bus.id)}
                                          className="text-green-600 hover:text-green-700"
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => rejectBus(bus.id)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Badge>Approved</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Bookings Tab */}
                  <TabsContent value="bookings" className="space-y-4">
                    <IncomeChart bookings={bookings} />

                    <div className="floating-window hover-card overflow-hidden border">
                      <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h2 className="text-lg font-bold">All Bookings</h2>
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="Search ID or Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Booking ID</TableHead>
                              <TableHead>Passenger</TableHead>
                              <TableHead>Route</TableHead>
                              <TableHead>Seats</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-center w-[150px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredBookings.length === 0 ? (
                              <TableRow><TableCell colSpan={6} className="text-center py-10">No bookings found</TableCell></TableRow>
                            ) : (
                              filteredBookings.map((b: any) => (
                                <TableRow key={b.baseId} className="transition-colors hover:bg-muted/70">
                                  <TableCell className="font-mono font-bold text-primary">{b.baseId}</TableCell>
                                  <TableCell>
                                    <div className="font-medium">{b.passengerName}</div>
                                    <div className="text-xs text-muted-foreground">{b.phoneNumber}</div>
                                  </TableCell>
                                  <TableCell className="text-sm">{b.routeName}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {b.seats.sort().map((s: string) => <Badge key={s} variant="outline" className="bg-primary/5">#{s}</Badge>)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={b.status === 'confirmed' ? 'default' : 'destructive'}>{b.status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex justify-center gap-2">
                                      {b.status === 'confirmed' ? (
                                        <Button size="sm" variant="ghost" className="text-orange-500 hover:bg-orange-50" onClick={() => handleStatusChange(b.baseId, 'cancelled', b.dbIds)} title="Cancel Booking"><XCircle className="h-4 w-4" /></Button>
                                      ) : (
                                        <Button size="sm" variant="ghost" className="text-green-500 hover:bg-green-50" onClick={() => handleStatusChange(b.baseId, 'confirmed', b.dbIds)} title="Restore Booking"><RefreshCw className="h-4 w-4" /></Button>
                                      )}
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" title="Delete Booking"><Trash2 className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This action will permanently delete booking <strong>{b.baseId}</strong> and all associated seats ({b.seats.length}).
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteBooking(b.baseId)} className="bg-red-500 text-white">Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-8">
                <div className="floating-window hover-card overflow-hidden border">
                  <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-lg font-display font-semibold">Bus Routes</h2>
                    <Dialog open={isAddRouteOpen} onOpenChange={setIsAddRouteOpen}>
                      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button></DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Add New Route</DialogTitle></DialogHeader>
                        <RouteFormWizard onSubmit={async (d) => {
                          await addRouteMutation.mutateAsync({
                            name: d.name,
                            from: d.from,
                            to: d.to,
                            departureTime: d.departureTime,
                            arrivalTime: d.arrivalTime || undefined,
                            price: parseInt(d.price),
                            busType: d.busType as BusType,
                            totalSeats: parseInt(d.totalSeats),
                            busNumber: d.busNumber || undefined,
                            driverName: d.driverName || undefined,
                            driverPhone: d.driverPhone || undefined,
                            conductorName: d.conductorName || undefined,
                            conductorPhone: d.conductorPhone || undefined,
                            viaPoints: d.viaPoints || [],
                          });
                          toast({ 
                            title: '✅ Route Added Successfully!', 
                            description: `${d.name} | ${d.from} → ${d.viaPoints.length > 0 ? d.viaPoints.join(' → ') + ' → ' : ''}${d.to} | ${d.departureTime} | LKR ${parseInt(d.price).toLocaleString()} | ${d.totalSeats} seats${d.viaPoints.length > 0 ? ` | ${d.viaPoints.length} stops` : ''}`,
                          });
                          setIsAddRouteOpen(false);
                        }} isSubmitting={addRouteMutation.isPending} />
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {routes.map((route) => (
                      <div key={route.id} onClick={() => setSelectedRouteForMap(route)}><RouteCard route={route} /></div>
                    ))}
                  </div>
                </div>
                <div className="floating-window hover-card overflow-hidden border lg:sticky lg:top-4">
                  <RouteMap route={selectedRouteForMap} className="h-[350px]" />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;