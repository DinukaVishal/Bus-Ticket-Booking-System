import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDrivers } from '@/hooks/useDrivers';
import { useCrewMembers } from '@/hooks/useCrewMembers';

export interface CrewDashboardStats {
  total_drivers: number;
  active_drivers: number;
  available_drivers: number;
  assigned_drivers: number;
  on_leave_drivers: number;
  total_crew: number;
  active_crew: number;
  assigned_buses: number;
}

/**
 * Service hook providing comprehensive stats for Drivers & Crew dashboard.
 * Unifies real counts across drivers, crew, and bus assignments.
 */
export function useCrewDashboardStats(ownerId?: string) {
  const { user, isAdmin, isBusOwner } = useAuth();
  const { data: drivers = [] } = useDrivers();
  const { data: crewMembers = [] } = useCrewMembers();

  return useQuery({
    queryKey: ['crew-dashboard-stats', ownerId || 'me', drivers.length, crewMembers.length],
    enabled: !!user && (isAdmin || isBusOwner),
    queryFn: async (): Promise<CrewDashboardStats> => {
      if (!user) {
        return {
          total_drivers: 0,
          active_drivers: 0,
          available_drivers: 0,
          assigned_drivers: 0,
          on_leave_drivers: 0,
          total_crew: 0,
          active_crew: 0,
          assigned_buses: 0,
        };
      }

      // Try RPC first
      try {
        const { data, error } = await supabase.rpc('get_crew_dashboard_stats', {
          _owner_id: isAdmin && ownerId ? ownerId : null,
        });

        if (!error && data && data.length > 0 && (data[0].total_drivers > 0 || data[0].total_crew > 0)) {
          return data[0] as CrewDashboardStats;
        }
      } catch {
        // Fallback to client aggregation
      }

      // Client aggregation from unified drivers and crew
      const total_drivers = drivers.length;
      const available_drivers = drivers.filter((d) => d.status === 'available').length;
      const assigned_drivers = drivers.filter((d) => d.status === 'assigned' || !!d.assigned_bus).length;
      const on_leave_drivers = drivers.filter((d) => d.status === 'on_leave').length;
      const active_drivers = total_drivers - drivers.filter((d) => d.status === 'inactive').length;

      const total_crew = crewMembers.length;
      const active_crew = crewMembers.filter((c) => c.status === 'active').length;

      // Unique buses assigned
      const assignedBusesSet = new Set<string>();
      drivers.forEach((d) => {
        if (d.assigned_bus) assignedBusesSet.add(d.assigned_bus);
      });
      crewMembers.forEach((c) => {
        if (c.assigned_bus) assignedBusesSet.add(c.assigned_bus);
      });

      return {
        total_drivers,
        active_drivers,
        available_drivers,
        assigned_drivers,
        on_leave_drivers,
        total_crew,
        active_crew,
        assigned_buses: assignedBusesSet.size,
      };
    },
  });
}
