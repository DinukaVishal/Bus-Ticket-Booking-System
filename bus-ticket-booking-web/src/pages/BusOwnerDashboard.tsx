import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Bus,
  Plus,
  Settings,
  LogOut,
  User,
  Calendar,
  Users,
  Trash,
  Edit,
  Radio,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BusInfo {
  id: string;
  bus_number: string;
  bus_type: string;
  total_seats: number;
  registration_number: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  staff_access_code: string;
  route_names?: string;
  route_paths?: string;
  route_ids?: string[];
}

interface StaffInfo {
  driver_name: string;
  driver_phone: string;
  conductor_name: string;
  conductor_phone: string;
}

const BusOwnerDashboard = () => {
  const { user, profile, isBusOwner, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [buses, setBuses] = useState<BusInfo[]>([]);
  const [staffInfo, setStaffInfo] = useState<Map<string, StaffInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && isBusOwner) {
      loadBuses();
    } else if (!authLoading) {
      console.log('Not loading buses - user:', !!user, 'isBusOwner:', isBusOwner);
    }
  }, [user, isBusOwner, authLoading]);

  const loadBuses = async () => {
    try {
      // Fetch buses for this bus owner
      const { data: busesData, error: busesError } = await supabase
        .from('owner_buses')
        .select('*')
        .eq('bus_owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (busesError) throw busesError;

      let busesWithRoute = busesData || [];

      if (busesData && busesData.length > 0) {
        // Fetch route assignments
        const { data: routeAssignments, error: routeError } = await supabase
          .from('owner_routes')
          .select('owner_bus_id, route_id')
          .eq('bus_owner_id', user.id)
          .eq('is_active', true)
          .in('owner_bus_id', busesData.map((bus) => bus.id));

        if (routeError) throw routeError;

        // Group route IDs by bus
        const routeIdMap = new Map<string, string[]>();
        routeAssignments?.forEach((assignment: any) => {
          const existing = routeIdMap.get(assignment.owner_bus_id) || [];
          routeIdMap.set(assignment.owner_bus_id, [...existing, assignment.route_id]);
        });

        // Fetch route details for all assigned routes
        const allRouteIds = Array.from(routeIdMap.values()).flat();
        let routeDetailsMap = new Map<string, { name: string; from_city: string; to_city: string }>();

        if (allRouteIds.length > 0) {
          const { data: routeDetails, error: detailsError } = await supabase
            .from('routes')
            .select('id, name, from_city, to_city')
            .in('id', allRouteIds);

          if (detailsError) throw detailsError;

          routeDetails?.forEach((route: any) => {
            routeDetailsMap.set(route.id, route);
          });
        }

        // Combine data
        busesWithRoute = busesData.map((bus) => {
          const routeIds = routeIdMap.get(bus.id) || [];
          const routeDetails = routeIds.map(id => routeDetailsMap.get(id)).filter(Boolean) as Array<{ name: string; from_city: string; to_city: string }>;

          return {
            ...bus,
            route_names: routeDetails.map((route) => route.name).join(' / '),
            route_paths: routeDetails.map((route) => `${route.from_city} → ${route.to_city}`).join(' / '),
            route_ids: routeIds,
          };
        });
      }

      setBuses(busesWithRoute);

      // Load driver and conductor info for each bus
      if (busesWithRoute && busesWithRoute.length > 0) {
        const staff = new Map<string, StaffInfo>();

        for (const bus of busesData) {
          // Get driver info
          const { data: driverData } = await supabase
            .from('bus_drivers')
            .select('driver_name, driver_phone')
            .eq('bus_id', bus.id)
            .single();

          // Get conductor info
          const { data: conductorData } = await supabase
            .from('bus_conductors')
            .select('conductor_name, conductor_phone')
            .eq('bus_id', bus.id)
            .single();

          if (driverData || conductorData) {
            staff.set(bus.id, {
              driver_name: driverData?.driver_name || 'N/A',
              driver_phone: driverData?.driver_phone || 'N/A',
              conductor_name: conductorData?.conductor_name || 'N/A',
              conductor_phone: conductorData?.conductor_phone || 'N/A',
            });
          }
        }

        setStaffInfo(staff);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading buses',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDeleteBus = async (busId: string) => {
    const confirmed = window.confirm('Delete this bus and its staff assignments?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('owner_buses')
        .delete()
        .eq('id', busId)
        .eq('bus_owner_id', user?.id);

      if (error) throw error;

      setBuses((prev) => prev.filter((bus) => bus.id !== busId));
      setStaffInfo((prev) => {
        const next = new Map(prev);
        next.delete(busId);
        return next;
      });

      toast({
        title: 'Bus deleted',
        description: 'The bus and related staff records were removed successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting bus',
        description: error.message || 'Unable to delete the bus.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleBusStatus = async (busId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from('owner_buses')
        .update({ is_active: newStatus })
        .eq('id', busId)
        .eq('bus_owner_id', user?.id);

      if (error) throw error;

      const { error: ownerRoutesError } = await supabase
        .from('owner_routes')
        .update({ is_active: newStatus })
        .eq('owner_bus_id', busId);

      if (ownerRoutesError) throw ownerRoutesError;

      // Update local state
      setBuses((prev) => prev.map((bus) => 
        bus.id === busId ? { ...bus, is_active: newStatus } : bus
      ));

      toast({
        title: 'Bus status updated',
        description: `Bus is now ${newStatus ? 'active' : 'inactive'}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error updating bus status',
        description: error.message || 'Unable to update bus status.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen page-shell page-bg bg-fixed booking-blur text-foreground">
      <Header />
      <div className="absolute inset-0 pointer-events-none bg-black/10 backdrop-blur-lg" />

      <main className="relative z-10 flex-1 container mx-auto px-4 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Bus Owner Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {profile?.displayName || 'Bus Owner'}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/bus-owner/profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Buses</p>
                  <p className="text-3xl font-bold">{buses.length}</p>
                </div>
                <Bus className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Buses</p>
                  <p className="text-3xl font-bold">{buses.filter(b => b.is_active).length}</p>
                </div>
                <Bus className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending Approval</p>
                  <p className="text-3xl font-bold">{buses.filter(b => b.approval_status === 'pending').length}</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Bus Button */}
        <div className="mb-8">
          <Button onClick={() => navigate('/bus-owner/add-bus')} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add New Bus
          </Button>
        </div>

        {/* Buses List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Buses</h2>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading buses...</p>
            </div>
          ) : buses.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Bus className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No buses registered yet</p>
                <Button onClick={() => navigate('/bus-owner/add-bus')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Bus
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {buses.map((bus) => {
                const staff = staffInfo.get(bus.id);
                return (
                  <Card key={bus.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{bus.bus_number}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{bus.bus_type}</p>
                          {bus.route_paths ? (
                            <p className="text-sm text-muted-foreground">
                              {bus.route_paths}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">No route assigned</p>
                          )}
                        </div>
                        <Badge className={getStatusColor(bus.approval_status)}>
                          {bus.approval_status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Bus Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Registration</span>
                          <span className="font-semibold">{bus.registration_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Seats</span>
                          <span className="font-semibold">{bus.total_seats}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Active Status</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${bus.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                              {bus.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <Switch
                              checked={bus.is_active}
                              onCheckedChange={() => handleToggleBusStatus(bus.id, bus.is_active)}
                              disabled={bus.approval_status !== 'approved'}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Staff Code</span>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs font-mono font-semibold">
                              {bus.staff_access_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(bus.staff_access_code);
                                toast({
                                  title: 'Code copied',
                                  description: 'Staff access code copied to clipboard.',
                                });
                              }}
                              className="h-6 w-6 p-0"
                            >
                              📋
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Staff Info */}
                      {staff && (
                        <div className="border-t pt-4 space-y-3">
                          <div className="text-sm">
                            <p className="flex items-center gap-2 text-muted-foreground mb-1">
                              <Users className="w-4 h-4" />
                              Driver
                            </p>
                            <p className="font-semibold">{staff.driver_name}</p>
                            <p className="text-xs text-muted-foreground">{staff.driver_phone}</p>
                          </div>
                          <div className="text-sm">
                            <p className="flex items-center gap-2 text-muted-foreground mb-1">
                              <Users className="w-4 h-4" />
                              Conductor
                            </p>
                            <p className="font-semibold">{staff.conductor_name}</p>
                            <p className="text-xs text-muted-foreground">{staff.conductor_phone}</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => navigate(`/bus-owner/add-trips/${bus.id}`)}
                        >
                          <Bus className="w-4 h-4 mr-2" />
                          Add Trips
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => navigate(`/bus-owner/edit-bus/${bus.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            if (bus.route_ids && bus.route_ids.length > 0) {
                              navigate(`/tracking/${bus.route_ids[0]}`);
                            } else {
                              toast({
                                title: 'No route assigned',
                                description: 'Cannot track bus without an assigned route.',
                                variant: 'destructive',
                              });
                            }
                          }}
                          disabled={!bus.route_ids || bus.route_ids.length === 0}
                        >
                          <Radio className="w-4 h-4 mr-2" />
                          Live Track
                        </Button>
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleDeleteBus(bus.id)}
                        >
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BusOwnerDashboard;
