import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Route, BusType } from '@/types/booking';

export function useRoutes() {
  return useQuery({
    queryKey: ['routes'],
    queryFn: async (): Promise<Route[]> => {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data.map(route => ({
        id: route.id,
        name: route.name,
        from: route.from_city,
        to: route.to_city,
        departureTime: route.departure_time,
        arrivalTime: route.arrival_time || undefined,
        price: route.price,
        busType: (route.bus_type || 'normal') as BusType,
        totalSeats: route.total_seats || 40,
        busNumber: route.bus_number || undefined,
        driverName: route.driver_name || undefined,
        driverPhone: route.driver_phone || undefined,
        conductorName: route.conductor_name || undefined,
        conductorPhone: route.conductor_phone || undefined,
        viaPoints: (route as { via_points?: string[] }).via_points || [],
      }));
    },
  });
}

export function useAddRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (route: Omit<Route, 'id'>) => {
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
    mutationFn: async (route: Route) => {
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
