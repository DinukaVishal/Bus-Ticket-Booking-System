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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useRoutes } from '@/hooks/useRoutes';
import { useBookings, useUpdateBookingStatus } from '@/hooks/useBookings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
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
  X, 
  ShieldCheck,
  ArrowRight,
  UserCheck,
  UserX
} from 'lucide-react';
import RouteCard from '@/components/admin/RouteCard';
import { Route, BusType } from '@/types/booking';
import RouteMap from '@/components/booking/RouteMap';
import IncomeChart from '@/components/admin/IncomeChart';

const Admin = () => {
  const navigate = useNavigate();
  const { data: routes = [], isLoading: routesLoading } = useRoutes();
  const { data: bookings = [], isLoading: bookingsLoading, refetch } = useBookings();
  const updateStatusMutation = useUpdateBookingStatus();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRouteForMap, setSelectedRouteForMap] = useState<Route | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [busOwners, setBusOwners] = useState<any[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState<'all' | 'driver' | 'conductor' | 'active' | 'inactive'>('all');
  const [updatingStaffId, setUpdatingStaffId] = useState<string | null>(null);

  // Fetch drivers, conductors and buses on mount
  const fetchDriversAndBuses = async () => {
    try {
      setDriversLoading(true);
      
      // Fetch bus drivers with bus details (both active and inactive)
      const { data: driverData, error: driverError } = await supabase
        .from('bus_drivers')
        .select(`
          id, 
          driver_name, 
          driver_phone, 
          assignment_date,
          is_active,
          bus_id,
          created_at,
          owner_buses(bus_number, bus_type, bus_owner_id)
        `)
        .order('created_at', { ascending: false });
      
      if (driverError) throw driverError;

      // Fetch bus conductors with bus details (both active and inactive)
      const { data: conductorData, error: conductorError } = await supabase
        .from('bus_conductors')
        .select(`
          id,
          conductor_name,
          conductor_phone,
          assignment_date,
          is_active,
          bus_id,
          created_at,
          owner_buses(bus_number, bus_type, bus_owner_id)
        `)
        .order('created_at', { ascending: false });
      
      if (conductorError) throw conductorError;

      // Combine drivers and conductors into a single array with type indicator
      const combinedStaff = [
        ...(driverData || []).map(d => ({ ...d, staff_type: 'driver' as const })),
        ...(conductorData || []).map(c => ({ ...c, staff_type: 'conductor' as const }))
      ];

      setDrivers(combinedStaff);

      // Fetch bus owners
      const { data: busOwnerData, error: busOwnerError } = await supabase
        .from('owner_buses')
        .select('bus_owner_id')
        .order('bus_owner_id');
      
      if (busOwnerError) {
        console.warn('Error fetching bus owners:', busOwnerError);
      } else {
        // Get unique bus owner IDs
        const uniqueOwnerIds = [...new Set((busOwnerData || []).map(b => b.bus_owner_id))];
        
        if (uniqueOwnerIds.length > 0) {
          // Fetch user details for bus owners
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, user_id, display_name, avatar_url')
            .in('user_id', uniqueOwnerIds);
          
          if (userError) {
            console.warn('Error fetching bus owner profiles:', userError);
          } else {
            setBusOwners(userData || []);
          }
        }
      }

      // Fetch buses
      const { data: busData, error: busError } = await supabase
        .from('owner_buses')
        .select('id, bus_owner_id, bus_number, bus_type, total_seats, approval_status, created_at')
        .order('created_at', { ascending: false });
      
      if (busError) throw busError;

      // Fetch driver route assignments with route details
      const { data: routeLinks, error: routeError } = await supabase
        .from('owner_routes')
        .select('owner_bus_id, route_id, is_active, routes(id, name, from_city, to_city)');

      if (routeError) throw routeError;

      const routeMap = (routeLinks || []).reduce((acc: Record<string, any>, entry: any) => {
        acc[entry.owner_bus_id] = entry;
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

  const handleStaffStatusChange = async (staff: any, newStatus: boolean) => {
    try {
      setUpdatingStaffId(staff.id);
      const table = staff.staff_type === 'driver' ? 'bus_drivers' : 'bus_conductors';
      const { error } = await supabase
        .from(table)
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', staff.id);

      if (error) throw error;

      // Also sync modern drivers / crew_members if available
      if (staff.staff_type === 'driver') {
        try {
          await supabase
            .from('drivers')
            .update({ status: newStatus ? 'available' : 'inactive', updated_at: new Date().toISOString() })
            .eq('id', staff.id);
        } catch (e) {
          console.warn('drivers sync notice:', e);
        }
      } else {
        try {
          await supabase
            .from('crew_members')
            .update({ status: newStatus ? 'active' : 'inactive', updated_at: new Date().toISOString() })
            .eq('id', staff.id);
        } catch (e) {
          console.warn('crew_members sync notice:', e);
        }
      }

      setDrivers((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, is_active: newStatus } : s))
      );

      toast({
        title: 'Staff status updated',
        description: `${staff.staff_type === 'driver' ? staff.driver_name : staff.conductor_name} is now marked as ${newStatus ? 'Active' : 'Inactive'}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error updating status',
        description: err.message || 'Failed to update staff status.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const staffCounts = useMemo(() => {
    return {
      all: drivers.length,
      drivers: drivers.filter((s) => s.staff_type === 'driver').length,
      conductors: drivers.filter((s) => s.staff_type === 'conductor').length,
      active: drivers.filter((s) => s.is_active !== false).length,
      inactive: drivers.filter((s) => s.is_active === false).length,
    };
  }, [drivers]);

  const filteredStaff = useMemo(() => {
    let list = drivers;

    if (staffFilter === 'driver') list = list.filter((s) => s.staff_type === 'driver');
    else if (staffFilter === 'conductor') list = list.filter((s) => s.staff_type === 'conductor');
    else if (staffFilter === 'active') list = list.filter((s) => s.is_active !== false);
    else if (staffFilter === 'inactive') list = list.filter((s) => s.is_active === false);

    const term = staffSearch.trim().toLowerCase();
    if (!term) return list;

    return list.filter((s) => {
      const name = (s.staff_type === 'driver' ? s.driver_name : s.conductor_name) || '';
      const phone = (s.staff_type === 'driver' ? s.driver_phone : s.conductor_phone) || '';
      const busNumber = s.owner_buses?.bus_number || '';
      return (
        name.toLowerCase().includes(term) ||
        phone.toLowerCase().includes(term) ||
        busNumber.toLowerCase().includes(term)
      );
    });
  }, [drivers, staffSearch, staffFilter]);

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

  const approveBus = async (busId: string) => {
    try {
      const bus = buses.find(b => b.id === busId);
      if (!bus) throw new Error('Bus not found');

      // Approve the bus
      const { error: busError } = await supabase
        .from('owner_buses')
        .update({ 
          approval_status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approval_date: new Date().toISOString()
        })
        .eq('id', busId);

      if (busError) throw busError;

      // Activate the owner_routes record
      const { error: routeError } = await supabase
        .from('owner_routes')
        .update({ is_active: true })
        .eq('owner_bus_id', busId);

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
      // Mark the bus as rejected
      const { error: busError } = await supabase
        .from('owner_buses')
        .update({ 
          approval_status: 'rejected',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approval_date: new Date().toISOString()
        })
        .eq('id', busId);

      if (busError) throw busError;

      // Deactivate the owner_routes record
      const { error: routeError } = await supabase
        .from('owner_routes')
        .update({ is_active: false })
        .eq('owner_bus_id', busId);

      if (routeError) throw routeError;

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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/overview')} size="lg" className="shadow-lg hover:scale-105 transition-all">
              <Users className="w-5 h-5 mr-2" /> Drivers &amp; Crew
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/compliance')} size="lg" className="shadow-lg hover:scale-105 transition-all">
              <ShieldCheck className="w-5 h-5 mr-2" /> Compliance &amp; Regulatory
            </Button>
            <Button onClick={() => navigate('/scan')} size="lg" className="shadow-lg hover:scale-105 transition-all">
              <QrCode className="w-5 h-5 mr-2" /> Scan Tickets
            </Button>
          </div>
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
                  <TabsList className="grid w-full grid-cols-4 rounded-3xl border border-border/70 bg-white/80 shadow-sm p-1">
                    <TabsTrigger value="drivers" className="transition-all duration-200">
                      <Users className="w-4 h-4 mr-2" />
                      Bus Staff
                    </TabsTrigger>
                    <TabsTrigger value="bus-owners">
                      <BusIcon className="w-4 h-4 mr-2" />
                      Bus Owners
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

                  {/* Drivers / Bus Staff Tab */}
                  <TabsContent value="drivers" className="space-y-4">
                    <div className="floating-window hover-card overflow-hidden border">
                      <div className="p-6 border-b space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-bold">Bus Staff</h2>
                              <Badge variant="secondary" className="font-mono text-xs">
                                {drivers.length} registered
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              View and change driver and conductor active/inactive status across all buses
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="Search staff, phone, bus..."
                                value={staffSearch}
                                onChange={(e) => setStaffSearch(e.target.value)}
                                className="pl-9 pr-8"
                              />
                              {staffSearch && (
                                <button
                                  onClick={() => setStaffSearch('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate('/admin/drivers')}
                              className="shadow-sm"
                            >
                              Manage Fleet Staff <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </div>
                        </div>

                        {/* Filter Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
                          {[
                            { id: 'all', label: 'All Staff', count: staffCounts.all },
                            { id: 'active', label: 'Active', count: staffCounts.active },
                            { id: 'inactive', label: 'Inactive', count: staffCounts.inactive },
                            { id: 'driver', label: 'Drivers', count: staffCounts.drivers },
                            { id: 'conductor', label: 'Conductors', count: staffCounts.conductors },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setStaffFilter(tab.id as any)}
                              className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5',
                                staffFilter === tab.id
                                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <span>{tab.label}</span>
                              <span
                                className={cn(
                                  'px-1.5 py-0.2 rounded-full text-[10px]',
                                  staffFilter === tab.id
                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                    : 'bg-muted text-foreground'
                                )}
                              >
                                {tab.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="min-w-[160px]">Name</TableHead>
                              <TableHead className="min-w-[130px]">Phone</TableHead>
                              <TableHead className="min-w-[110px]">Role</TableHead>
                              <TableHead className="min-w-[150px]">Assigned Bus</TableHead>
                              <TableHead className="min-w-[130px]">Status</TableHead>
                              <TableHead className="text-center w-[130px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredStaff.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-10">
                                  <p className="text-muted-foreground">No bus staff found</p>
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredStaff.map((staff: any) => (
                                <TableRow key={staff.id} className="transition-colors hover:bg-muted/70 group">
                                  <TableCell className="font-medium text-foreground">
                                    {staff.staff_type === 'driver' ? staff.driver_name : staff.conductor_name}
                                  </TableCell>
                                  <TableCell className="text-sm font-mono">
                                    {staff.staff_type === 'driver' ? staff.driver_phone : staff.conductor_phone}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        staff.staff_type === 'driver'
                                          ? 'bg-primary/10 text-primary border-primary/20'
                                          : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                                      )}
                                    >
                                      {staff.staff_type === 'driver' ? 'Driver' : 'Conductor'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {staff.owner_buses ? (
                                      <div>
                                        <div className="font-mono font-medium text-foreground">{staff.owner_buses.bus_number}</div>
                                        <div className="text-xs capitalize">{staff.owner_buses.bus_type?.replace('_', ' ')}</div>
                                      </div>
                                    ) : (
                                      <span className="italic text-muted-foreground">Not assigned</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={staff.is_active !== false ? 'active' : 'inactive'}
                                      onValueChange={(val) => handleStaffStatusChange(staff, val === 'active')}
                                      disabled={updatingStaffId === staff.id}
                                    >
                                      <SelectTrigger
                                        className={cn(
                                          'h-7 px-2.5 rounded-full text-xs font-semibold border transition-all w-[115px] shadow-none focus:ring-1',
                                          staff.is_active !== false
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                            : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800'
                                        )}
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          {updatingStaffId === staff.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                          ) : (
                                            <span
                                              className={cn(
                                                'w-1.5 h-1.5 rounded-full shrink-0',
                                                staff.is_active !== false ? 'bg-emerald-500' : 'bg-zinc-400'
                                              )}
                                            />
                                          )}
                                          <SelectValue />
                                        </div>
                                      </SelectTrigger>
                                      <SelectContent align="start" className="min-w-[115px]">
                                        <SelectItem value="active">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span>Active</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-zinc-400" />
                                            <span>Inactive</span>
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStaffStatusChange(staff, !staff.is_active)}
                                      disabled={updatingStaffId === staff.id}
                                      className={cn(
                                        'h-7 px-2 text-xs font-medium',
                                        staff.is_active !== false
                                          ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                          : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                      )}
                                      title={staff.is_active !== false ? 'Deactivate staff' : 'Activate staff'}
                                    >
                                      {staff.is_active !== false ? (
                                        <>
                                          <UserX className="w-3.5 h-3.5 mr-1" />
                                          Deactivate
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                                          Activate
                                        </>
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Bus Owners Tab */}
                  <TabsContent value="bus-owners" className="space-y-4">
                    <div className="floating-window hover-card overflow-hidden border">
                      <div className="p-6 border-b">
                        <h2 className="text-lg font-bold">Bus Owners</h2>
                        <p className="text-sm text-muted-foreground mt-1">Manage bus owner accounts</p>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>User ID</TableHead>
                              <TableHead>Total Buses</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {busOwners.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                  <p className="text-muted-foreground">No bus owners found</p>
                                </TableCell>
                              </TableRow>
                            ) : (
                              busOwners.map((owner) => {
                                const ownerBuses = buses.filter(b => b.bus_owner_id === owner.user_id);
                                return (
                                  <TableRow key={owner.id} className="transition-colors hover:bg-muted/70">
                                    <TableCell className="font-medium">
                                      {owner.display_name || 'Unnamed Owner'}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{owner.user_id}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{ownerBuses.length} buses</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="default">Active</Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
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
                                    <Badge variant={
                                      bus.approval_status === 'approved' ? 'default' : 
                                      bus.approval_status === 'rejected' ? 'destructive' : 'secondary'
                                    }>
                                      {bus.approval_status === 'approved' ? 'Approved' : 
                                       bus.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {bus.approval_status === 'pending' ? (
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
                                      <Badge variant={bus.approval_status === 'approved' ? 'default' : 'destructive'}>
                                        {bus.approval_status === 'approved' ? 'Approved' : 'Rejected'}
                                      </Badge>
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
                  <div className="p-6 border-b">
                    <h2 className="text-lg font-display font-semibold">Bus Routes</h2>
                  </div>
                  <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {routes.map((route) => (
                      <div key={route.id} onClick={() => setSelectedRouteForMap(route)}><RouteCard route={route} allowEdit={false} /></div>
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