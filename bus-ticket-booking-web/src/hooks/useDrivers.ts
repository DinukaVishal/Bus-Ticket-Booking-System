import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DriverRow } from '@/types/crew';

/**
 * Service hook for managing Drivers.
 *
 * Access model (enforced by RLS + RPC in the DB):
 *   - Admin       -> full CRUD on all drivers
 *   - Bus Owner   -> CRUD on their own drivers (owner_id = auth.uid())
 *   - Staff       -> read-only (via RPC, not through this hook)
 */
export function useDrivers() {
  const { user, isAdmin, isBusOwner } = useAuth();

  return useQuery({
    queryKey: ['drivers'],
    enabled: !!user && (isAdmin || isBusOwner),
    queryFn: async (): Promise<DriverRow[]> => {
      if (!user) return [];

      // Admins see all drivers; bus owners see only their own.
      let query = supabase
        .from('drivers')
        .select('*')
        .order('full_name');

      if (!isAdmin) {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DriverRow[];
    },
  });
}

export function useAddDriver() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isBusOwner } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      fullName: string;
      nic: string;
      phone: string;
      email?: string | null;
      address?: string | null;
      licenseNumber: string;
      licenseExpiryDate: string;
      dateOfBirth?: string | null;
      emergencyContact?: string | null;
      status?: string;
      imageUrl?: string | null;
      ownerId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated.');

      // Admins can optionally set a specific owner; bus owners are always self.
      const ownerId = isAdmin ? (input.ownerId || user.id) : user.id;

      const { data, error } = await supabase
        .from('drivers')
        .insert({
          owner_id: ownerId,
          full_name: input.fullName,
          nic: input.nic,
          phone: input.phone,
          email: input.email || null,
          address: input.address || null,
          license_number: input.licenseNumber,
          license_expiry_date: input.licenseExpiryDate,
          date_of_birth: input.dateOfBirth || null,
          emergency_contact: input.emergencyContact || null,
          status: input.status || 'available',
          image_url: input.imageUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DriverRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      fullName?: string;
      nic?: string;
      phone?: string;
      email?: string | null;
      address?: string | null;
      licenseNumber?: string;
      licenseExpiryDate?: string;
      dateOfBirth?: string | null;
      emergencyContact?: string | null;
      status?: string;
      imageUrl?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('drivers')
        .update({
          ...(input.fullName !== undefined && { full_name: input.fullName }),
          ...(input.nic !== undefined && { nic: input.nic }),
          ...(input.phone !== undefined && { phone: input.phone }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.address !== undefined && { address: input.address }),
          ...(input.licenseNumber !== undefined && { license_number: input.licenseNumber }),
          ...(input.licenseExpiryDate !== undefined && { license_expiry_date: input.licenseExpiryDate }),
          ...(input.dateOfBirth !== undefined && { date_of_birth: input.dateOfBirth }),
          ...(input.emergencyContact !== undefined && { emergency_contact: input.emergencyContact }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.imageUrl !== undefined && { image_url: input.imageUrl }),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data as DriverRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
    },
  });
}

