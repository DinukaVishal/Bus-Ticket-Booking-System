import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CrewMemberRow } from '@/types/crew';

/**
 * Service hook for managing Crew Members (conductors, inspectors, assistants).
 * Unifies records from 'crew_members', 'bus_conductors', and 'trips'.
 */
export function useCrewMembers() {
  const { user, isAdmin, isBusOwner } = useAuth();

  return useQuery({
    queryKey: ['crew-members', isAdmin ? 'all' : user?.id],
    enabled: !!user && (isAdmin || isBusOwner),
    queryFn: async (): Promise<CrewMemberRow[]> => {
      if (!user) return [];

      const crewMap = new Map<string, CrewMemberRow>();

      // 1. Fetch from 'crew_members' table (if available)
      try {
        let crewQuery = supabase
          .from('crew_members')
          .select('*')
          .order('full_name');

        if (!isAdmin) {
          crewQuery = crewQuery.eq('owner_id', user.id);
        }

        const { data: crewData, error: crewError } = await crewQuery;
        if (!crewError && Array.isArray(crewData)) {
          for (const c of crewData) {
            crewMap.set(c.id, {
              id: c.id,
              owner_id: c.owner_id,
              full_name: c.full_name,
              nic: c.nic || 'Registered',
              phone: c.phone,
              email: c.email || null,
              address: c.address || null,
              emergency_contact: c.emergency_contact || null,
              crew_role: c.crew_role || 'conductor',
              status: c.status || 'active',
              created_at: c.created_at,
              updated_at: c.updated_at,
              source: 'crew_members',
            });
          }
        }
      } catch (err) {
        console.warn('crew_members query notice:', err);
      }

      // 2. Fetch from 'bus_conductors' table
      try {
        let busConductorsQuery = supabase
          .from('bus_conductors')
          .select(`
            id,
            bus_owner_id,
            bus_id,
            conductor_name,
            conductor_phone,
            assignment_date,
            is_active,
            created_at,
            updated_at,
            owner_buses(id, bus_number, bus_type, bus_owner_id)
          `)
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          busConductorsQuery = busConductorsQuery.eq('bus_owner_id', user.id);
        }

        const { data: conductorsData, error: conductorsError } = await busConductorsQuery;
        if (!conductorsError && Array.isArray(conductorsData)) {
          for (const bc of conductorsData) {
            const busInfo = bc.owner_buses as any;
            const busNumber = busInfo?.bus_number || null;

            let existingKey: string | null = null;
            for (const [key, existing] of crewMap.entries()) {
              const samePhone = bc.conductor_phone && existing.phone && existing.phone === bc.conductor_phone;
              const sameName =
                bc.conductor_name &&
                existing.full_name &&
                existing.full_name.toLowerCase().trim() === bc.conductor_name.toLowerCase().trim();

              if (samePhone || sameName) {
                existingKey = key;
                break;
              }
            }

            if (existingKey) {
              const existing = crewMap.get(existingKey)!;
              crewMap.set(existingKey, {
                ...existing,
                assigned_bus: busNumber || existing.assigned_bus,
                bus_id: bc.bus_id || existing.bus_id,
                bus_number: busNumber || existing.bus_number,
                status: bc.is_active === false ? 'inactive' : existing.status,
              });
            } else {
              crewMap.set(bc.id, {
                id: bc.id,
                owner_id: bc.bus_owner_id,
                full_name: bc.conductor_name,
                nic: (bc as any).nic || 'Registered',
                phone: bc.conductor_phone,
                crew_role: 'conductor',
                status: bc.is_active === false ? 'inactive' : 'active',
                assigned_bus: busNumber,
                bus_id: bc.bus_id,
                bus_number: busNumber,
                created_at: bc.created_at || bc.assignment_date,
                updated_at: bc.updated_at,
                source: 'bus_conductors',
              });
            }
          }
        }
      } catch (err) {
        console.warn('bus_conductors query notice:', err);
      }

      // 3. Fetch from 'trips' for any conductors
      try {
        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select('id, conductor_name, conductor_phone, bus_number, is_active, created_at')
          .not('conductor_name', 'is', null);

        if (!tripsError && Array.isArray(tripsData)) {
          for (const trip of tripsData) {
            if (!trip.conductor_name || !trip.conductor_name.trim()) continue;

            let existingKey: string | null = null;
            for (const [key, existing] of crewMap.entries()) {
              const samePhone = trip.conductor_phone && existing.phone && existing.phone === trip.conductor_phone;
              const sameName =
                existing.full_name &&
                existing.full_name.toLowerCase().trim() === trip.conductor_name.toLowerCase().trim();

              if (samePhone || sameName) {
                existingKey = key;
                break;
              }
            }

            if (existingKey) {
              const existing = crewMap.get(existingKey)!;
              if (!existing.assigned_bus && trip.bus_number) {
                crewMap.set(existingKey, {
                  ...existing,
                  assigned_bus: trip.bus_number,
                  bus_number: trip.bus_number,
                });
              }
            } else if (isAdmin) {
              crewMap.set(`trip_crew_${trip.id}`, {
                id: `trip_crew_${trip.id}`,
                full_name: trip.conductor_name.trim(),
                nic: 'Registered',
                phone: trip.conductor_phone || 'N/A',
                crew_role: 'conductor',
                status: trip.is_active ? 'active' : 'inactive',
                assigned_bus: trip.bus_number,
                bus_number: trip.bus_number,
                created_at: trip.created_at,
                source: 'trips',
              });
            }
          }
        }
      } catch (err) {
        console.warn('trips crew query notice:', err);
      }

      return Array.from(crewMap.values()).sort((a, b) =>
        a.full_name.localeCompare(b.full_name)
      );
    },
  });
}

export function useAddCrewMember() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

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
      busId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated.');

      const ownerId = isAdmin ? input.ownerId || user.id : user.id;

      // 1. Try 'crew_members'
      try {
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

        if (!error && data) return data as CrewMemberRow;
      } catch (err) {
        console.warn('crew_members table insert fallback to bus_conductors:', err);
      }

      // 2. Fallback to 'bus_conductors'
      const { data: bcData, error: bcError } = await supabase
        .from('bus_conductors')
        .insert({
          bus_owner_id: ownerId,
          bus_id: input.busId || null,
          conductor_name: input.fullName,
          conductor_phone: input.phone,
          is_active: input.status !== 'inactive',
        })
        .select()
        .single();

      if (bcError) throw bcError;

      return {
        id: bcData.id,
        owner_id: bcData.bus_owner_id,
        full_name: bcData.conductor_name,
        nic: input.nic || 'Registered',
        phone: bcData.conductor_phone,
        crew_role: input.crewRole,
        status: input.status || 'active',
        source: 'bus_conductors',
      } as CrewMemberRow;
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
      busId?: string | null;
    }) => {
      let updated = false;

      // Update 'crew_members'
      try {
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

        if (!error && data) {
          updated = true;
          return data as CrewMemberRow;
        }
      } catch (err) {
        console.warn('crew_members update fallback:', err);
      }

      // Update 'bus_conductors'
      try {
        const { data: bcData, error: bcError } = await supabase
          .from('bus_conductors')
          .update({
            ...(input.fullName !== undefined && { conductor_name: input.fullName }),
            ...(input.phone !== undefined && { conductor_phone: input.phone }),
            ...(input.status !== undefined && { is_active: input.status !== 'inactive' }),
            ...(input.busId !== undefined && { bus_id: input.busId }),
          })
          .eq('id', input.id)
          .select()
          .single();

        if (!bcError && bcData) {
          updated = true;
          return {
            id: bcData.id,
            owner_id: bcData.bus_owner_id,
            full_name: bcData.conductor_name,
            nic: input.nic || 'Registered',
            phone: bcData.conductor_phone,
            crew_role: input.crewRole || 'conductor',
            status: input.status || (bcData.is_active ? 'active' : 'inactive'),
            source: 'bus_conductors',
          } as CrewMemberRow;
        }
      } catch (err) {
        console.warn('bus_conductors update error:', err);
      }

      if (!updated) {
        throw new Error('Crew member could not be updated.');
      }
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
      try {
        await supabase.from('crew_members').delete().eq('id', crewId);
      } catch (e) {
        console.warn('crew_members delete notice:', e);
      }

      try {
        await supabase.from('bus_conductors').delete().eq('id', crewId);
      } catch (e) {
        console.warn('bus_conductors delete notice:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-members'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
    },
  });
}
