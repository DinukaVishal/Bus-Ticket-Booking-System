import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Route, BusType, normalizeBusType, BUS_TYPE_CONFIGS } from '@/types/booking';

interface RouteRow {
  id?: string;
  name: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime?: string;
  price: number;
  busType: BusType;
  totalSeats: number;
  busNumber?: string;
  driverName?: string;
  driverPhone?: string;
  conductorName?: string;
  conductorPhone?: string;
  viaPoints?: string[];
}

export function useRoutes() {
  return useQuery({
    queryKey: ['routes'],
    queryFn: async (): Promise<Route[]> => {
      // Fetch all routes
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .order('name');
      
      if (routesError) throw routesError;
      
      // Fetch all trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('is_active', true)
        .order('departure_time');
      
      if (tripsError) throw tripsError;

      // For passengers, show all routes that have active trips
      // For bus owners/admins, filter by their owned routes
      const { data: { user } } = await supabase.auth.getUser();
      const isBusOwner = user?.user_metadata?.role === 'bus_owner';
      const isAdmin = user?.user_metadata?.role === 'admin';

      let filteredRoutesData = routesData;
      const ownerBusByRouteId: Record<string, { bus_number?: string; bus_type?: string; total_seats?: number }> = {};

      const { data: activeOwnerRoutesData, error: ownerRoutesError } = await supabase
        .from('owner_routes')
        .select('route_id, owner_buses!inner(bus_number, bus_type, total_seats, is_active)')
        .eq('is_active', true)
        .eq('owner_buses.is_active', true);

      if (ownerRoutesError) {
        console.warn('Failed to fetch owner route assignments:', ownerRoutesError);
      }

      // Map route_id -> owner bus info so passenger view can prefer owner-assigned bus values
      (activeOwnerRoutesData || []).forEach((assignment: any) => {
        if (!assignment || !assignment.route_id) return;
        const ob = assignment.owner_buses;
        if (ob && ob.is_active) {
          ownerBusByRouteId[assignment.route_id] = {
            bus_number: ob.bus_number,
            bus_type: ob.bus_type,
            total_seats: ob.total_seats,
          };
        }
      });

      if (!isBusOwner && !isAdmin) {
        // For passengers, show only routes that currently have active trips.
        // Prefer active owner-assigned bus info when available, but do not hide routes
        // if they are not linked via owner_routes.
        const routesWithTrips = new Set(
          (tripsData || []).map(trip => trip.route_id)
        );

        filteredRoutesData = routesData.filter(route => routesWithTrips.has(route.id));
      }

      console.log('Filtered routes:', filteredRoutesData.length);
      
      // Map routes and group trips
      return filteredRoutesData.map(route => {
        const routeTrips = (tripsData || []).filter(trip => trip.route_id === route.id);
        
        const firstTrip = routeTrips[0];
        const ownerBus = (ownerBusByRouteId as any)[route.id];
        const busTypeSource = ownerBus?.bus_type || route.bus_type;
        const normalizedBusType = normalizeBusType(busTypeSource);
        const seatsFromOwner = ownerBus?.total_seats;
        return {
          id: route.id,
          name: route.name,
          from: route.from_city,
          to: route.to_city,
          busType: normalizedBusType,
          totalSeats: seatsFromOwner || BUS_TYPE_CONFIGS[normalizedBusType]?.defaultSeats || 54,
          busNumber: ownerBus?.bus_number || route.bus_number || undefined,
          driverName: route.driver_name || undefined,
          driverPhone: route.driver_phone || undefined,
          conductorName: route.conductor_name || undefined,
          conductorPhone: route.conductor_phone || undefined,
          departureTime: firstTrip?.departure_time || route.departure_time,
          arrivalTime: firstTrip?.arrival_time || route.arrival_time || undefined,
          price: firstTrip?.price ?? route.price,
          trips: routeTrips.map(trip => ({
            id: trip.id,
            departureTime: trip.departure_time,
            arrivalTime: trip.arrival_time || undefined,
            price: trip.price,
            busNumber: trip.bus_number || undefined,
            driverName: trip.driver_name || undefined,
            driverPhone: trip.driver_phone || undefined,
            conductorName: trip.conductor_name || undefined,
            conductorPhone: trip.conductor_phone || undefined,
            stopArrivalTimes: trip.via_stop_arrival_times || [],
          })),
          viaPoints: (route as { via_points?: string[] }).via_points || [],
        };
      });
    },
  });
}

export function useAddRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (route: RouteRow) => {
      const { data, error } = await supabase
        .from('routes')
        .insert({
          name: route.name,
          from_city: route.from,
          to_city: route.to,
          departure_time: route.departureTime,
          arrival_time: route.arrivalTime || null,
          price: route.price,
          bus_type: route.busType,
          total_seats: route.totalSeats,
          bus_number: route.busNumber || null,
          driver_name: route.driverName || null,
          driver_phone: route.driverPhone || null,
          conductor_name: route.conductorName || null,
          conductor_phone: route.conductorPhone || null,
          via_points: route.viaPoints || [],
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (route: RouteRow) => {
      const { data, error } = await supabase
        .from('routes')
        .update({
          name: route.name,
          from_city: route.from,
          to_city: route.to,
          departure_time: route.departureTime,
          arrival_time: route.arrivalTime || null,
          price: route.price,
          bus_type: route.busType,
          total_seats: route.totalSeats,
          bus_number: route.busNumber || null,
          driver_name: route.driverName || null,
          driver_phone: route.driverPhone || null,
          conductor_name: route.conductorName || null,
          conductor_phone: route.conductorPhone || null,
          via_points: route.viaPoints || [],
        })
        .eq('id', route.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (routeId: string) => {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}
