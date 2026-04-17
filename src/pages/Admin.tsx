import { useState, useMemo } from 'react';
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
  Route as RouteIcon
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

  const isLoading = routesLoading || bookingsLoading;

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
              <div className="bg-card rounded-xl p-6 shadow-card">
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
              <div className="bg-card rounded-xl p-6 shadow-card border-l-4 border-green-500">
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
              <div className="bg-card rounded-xl p-6 shadow-card border-l-4 border-red-500">
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
              <div className="bg-card rounded-xl p-6 shadow-card">
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
                <IncomeChart bookings={bookings} />

                <div className="bg-card rounded-xl shadow-card overflow-hidden border">
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
                          {/* වෙනස්කම 1: Actions මැදට ගත්තා */}
                          <TableHead className="text-center w-[150px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-10">No bookings found</TableCell></TableRow>
                        ) : (
                          filteredBookings.map((b: any) => (
                            <TableRow key={b.baseId}>
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
                              {/* වෙනස්කම 2: Button ටික මැදට ගත්තා */}
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
              </div>

              <div className="space-y-8">
                <div className="bg-card rounded-xl shadow-card overflow-hidden border">
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
                <div className="bg-card rounded-xl shadow-card overflow-hidden border lg:sticky lg:top-4">
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