import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CrewAttendanceRow } from '@/types/crew';

/**
 * Service hook for managing Crew Attendance.
 *
 * Access model (enforced by RLS in the DB):
 *   - Admin       -> full CRUD on all attendance
 *   - Bus Owner   -> CRUD on their own attendance
 *   - Staff       -> read-only (via RPC, not through this hook)
 */
export function useCrewAttendance(date?: string) {
  const { user, isAdmin, isBusOwner } = useAuth();

  return useQuery({
    queryKey: ['crew-attendance', date || 'all'],
    enabled: !!user && (isAdmin || isBusOwner),
    queryFn: async (): Promise<CrewAttendanceRow[]> => {
      if (!user) return [];

      let query = supabase
        .from('crew_attendance')
        .select(`
          *,
          crew_members(id, full_name, phone, crew_role)
        `)
        .order('date', { ascending: false });

      if (!isAdmin) {
        query = query.eq('owner_id', user.id);
      }

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CrewAttendanceRow[];
    },
  });
}

export function useUpsertCrewAttendance() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      crewId: string;
      date: string;
      status: 'present' | 'absent' | 'late' | 'leave';
      notes?: string | null;
      ownerId?: string;
      attendanceId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated.');

      const ownerId = isAdmin ? (input.ownerId || user.id) : user.id;

      // Upsert based on unique (crew_id, date) constraint.
      const { data, error } = await supabase
        .from('crew_attendance')
        .upsert({
          ...(input.attendanceId ? { id: input.attendanceId } : {}),
          owner_id: ownerId,
          crew_id: input.crewId,
          date: input.date,
          status: input.status,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CrewAttendanceRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-attendance'] });
    },
  });
}

export function useDeleteCrewAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendanceId: string) => {
      const { error } = await supabase
        .from('crew_attendance')
        .delete()
        .eq('id', attendanceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-attendance'] });
    },
  });
}

