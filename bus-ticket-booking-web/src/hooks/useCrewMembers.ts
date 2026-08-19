import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CrewMemberRow } from '@/types/crew';

/**
 * Service hook for managing Crew Members.
 *
 * Access model (enforced by RLS in the DB):
 *   - Admin       -> full CRUD on all crew
 *   - Bus Owner   -> CRUD on their own crew (owner_id = auth.uid())
 *   - Staff       -> read-only (via RPC, not through this hook)
 */
export function useCrewMembers() {
  const { user, isAdmin, isBusOwner } = useAuth();

  return useQuery({
    queryKey: ['crew-members'],
    enabled: !!user && (isAdmin || isBusOwner),
    queryFn: async (): Promise<CrewMemberRow[]> => {
      if (!user) return [];

      let query = supabase
        .from('crew_members')
        .select('*')
        .order('full_name');

      if (!isAdmin) {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CrewMemberRow[];
    },
  });
}

export function useAddCrewMember() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isBusOwner } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      fullName: string;
      nic: string;
      phone: string;
      email?: string | null;
      address?: string | null;
      emergencyContact?: string | null;
      crewRole: 'conductor' | 'inspector' | 'assistant';
      status?: string;
      ownerId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated.');

      const ownerId = isAdmin ? (input.ownerId || user.id) : user.id;

      const { data, error } = await supabase
        .from('crew_members')
        .insert({
          owner_id: ownerId,
          full_name: input.fullName,
          nic: input.nic,
          phone: input.phone,
          email: input.email || null,
          address: input.address || null,
          emergency_contact: input.emergencyContact || null,
          crew_role: input.crewRole,
          status: input.status || 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data as CrewMemberRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-members'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
    },
  });
}

export function useUpdateCrewMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      fullName?: string;
      nic?: string;
      phone?: string;
      email?: string | null;
      address?: string | null;
      emergencyContact?: string | null;
      crewRole?: 'conductor' | 'inspector' | 'assistant';
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('crew_members')
        .update({
          ...(input.fullName !== undefined && { full_name: input.fullName }),
          ...(input.nic !== undefined && { nic: input.nic }),
          ...(input.phone !== undefined && { phone: input.phone }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.address !== undefined && { address: input.address }),
          ...(input.emergencyContact !== undefined && { emergency_contact: input.emergencyContact }),
          ...(input.crewRole !== undefined && { crew_role: input.crewRole }),
          ...(input.status !== undefined && { status: input.status }),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data as CrewMemberRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-members'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
    },
  });
}

export function useDeleteCrewMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (crewId: string) => {
      const { error } = await supabase
        .from('crew_members')
        .delete()
        .eq('id', crewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-members'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
    },
  });
}

