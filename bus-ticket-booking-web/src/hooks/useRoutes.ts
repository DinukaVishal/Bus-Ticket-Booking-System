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

      if (isBusOwner || isAdmin) {
        // Bus owners and admins should be able to see all routes in the system,
        // including newly created routes and those that are not yet assigned to an approved bus.
        filteredRoutesData = routesData;
      } else {
        // For passengers, show only routes that currently have active trips
        // and whose owner-route assignment is still active.
        const routesWithTrips = new Set(
          (tripsData || []).map(trip => trip.route_id)
        );

        const { data: activeOwnerRoutesData, error: ownerRoutesError } = await supabase
          .from('owner_routes')
        .select('route_id, owner_buses(is_active)')
        .eq('is_active', true)
        .eq('owner_buses.is_active', true);

        const activeRouteIds = new Set(
          (activeOwnerRoutesData || []).map((assignment: any) => assignment.route_id)
        );

        filteredRoutesData = routesData.filter(
          route => routesWithTrips.has(route.id) && activeRouteIds.has(route.id)
        );
      }

      console.log('Filtered routes:', filteredRoutesData.length);
      
      // Map routes and group trips
      return filteredRoutesData.map(route => {
        const routeTrips = (tripsData || []).filter(trip => trip.route_id === route.id);
        
        const firstTrip = routeTrips[0];
        return {
          id: route.id,
          name: route.name,
          from: route.from_city,
          to: route.to_city,
          busType: normalizeBusType(route.bus_type),
          totalSeats: BUS_TYPE_CONFIGS[normalizeBusType(route.bus_type)]?.defaultSeats || 54,
          busNumber: route.bus_number || undefined,
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
