import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { BusAssignmentRow } from '@/types/crew';

/**
 * Service hook for managing Bus Assignments (driver/crew <-> bus/route/schedule).
 *
 * Access model (enforced by RLS + RPC in the DB):
 *   - Admin       -> full CRUD on all assignments
 *   - Bus Owner   -> CRUD on their own assignments
 *   - Staff       -> read-only (via RPC, not through this hook)
 */
export function useBusAssignments() {
  const { user, isAdmin, isBusOwner } = useAuth();

  return useQuery({
    queryKey: ['bus-assignments'],
    enabled: !!user && (isAdmin || isBusOwner),
    queryFn: async (): Promise<BusAssignmentRow[]> => {
      if (!user) return [];

      let query = supabase
        .from('bus_assignments')
        .select(`
          *,
          owner_buses(id, bus_number, bus_type, bus_owner_id),
          routes(id, name, from_city, to_city),
          trips(id, departure_time, arrival_time, price, bus_number),
          drivers(id, full_name, phone, status),
          crew_members(id, full_name, phone, crew_role, status)
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BusAssignmentRow[];
    },
  });
}

export function useAssignDriverCrew() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      ownerId: string;
      busId: string;
      routeId: string;
      scheduleId?: string | null;
      driverId?: string | null;
      crewId?: string | null;
      assignedDate?: string;
    }) => {
      if (!user) throw new Error('Not authenticated.');

      // Admins can manage any owner's assignment; the RPC validates ownership.
      const { data, error } = await supabase.rpc('assign_driver_crew', {
        _owner_id: input.ownerId,
        _bus_id: input.busId,
        _route_id: input.routeId,
        _schedule_id: input.scheduleId || null,
        _driver_id: input.driverId || null,
        _crew_id: input.crewId || null,
        _assigned_date: input.assignedDate || new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      // RPC returns { success, assignment_id?, error? }
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create assignment.');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
    },
  });
}

export function useEndBusAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      status,
    }: {
      assignmentId: string;
      status: 'completed' | 'cancelled';
    }) => {
      const { data, error } = await supabase.rpc('end_bus_assignment', {
        _assignment_id: assignmentId,
        _status: status,
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to end assignment.');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
    },
  });
}

export function useDeleteBusAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('bus_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
    },
  });
}

