import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
 * Hook that fetches crew/assignment analytics counts via the
 * get_crew_dashboard_stats RPC. The RPC scopes results to the caller:
 *   - Bus Owner -> their own stats
 *   - Admin     -> optionally a target owner (or defaults to own scope)
 */
export function useCrewDashboardStats(ownerId?: string) {
  const { user, isAdmin, isBusOwner } = useAuth();

  return useQuery({
    queryKey: ['crew-dashboard-stats', ownerId || 'me'],
    enabled: !!user && (isAdmin || isBusOwner),
    queryFn: async (): Promise<CrewDashboardStats | null> => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_crew_dashboard_stats', {
        _owner_id: isAdmin && ownerId ? ownerId : null,
      });

      if (error) throw error;
      return (data?.[0] ?? null) as CrewDashboardStats | null;
    },
  });
}

