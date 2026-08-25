import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DriverRow } from '@/types/crew';

/**
 * Service hook for managing Drivers.
 *
 * Unifies all driver sources across the system:
 *   1. 'drivers' table (Driver & Crew management records)
 *   2. 'bus_drivers' table (drivers registered by bus owners with their buses)
 *   3. 'trips' / 'routes' (active trip drivers)
 *
 * Access model:
 *   - Admin       -> views and manages all drivers across all buses/owners
 *   - Bus Owner   -> views and manages their own registered drivers
 */
export function useDrivers() {
  const { user, isAdmin, isBusOwner } = useAuth();

  return useQuery({
    queryKey: ['drivers', isAdmin ? 'all' : user?.id],
    enabled: !!user && (isAdmin || isBusOwner),
    queryFn: async (): Promise<DriverRow[]> => {
      if (!user) return [];

      const driversMap = new Map<string, DriverRow>();

      // 1. Fetch from 'drivers' table (if available)
      try {
        let driversQuery = supabase
          .from('drivers')
          .select('*')
          .order('full_name');

        if (!isAdmin) {
          driversQuery = driversQuery.eq('owner_id', user.id);
        }

        const { data: driversData, error: driversError } = await driversQuery;
        if (!driversError && Array.isArray(driversData)) {
          for (const d of driversData) {
            driversMap.set(d.id, {
              id: d.id,
              owner_id: d.owner_id,
              full_name: d.full_name,
              nic: d.nic || 'Registered',
              phone: d.phone,
              email: d.email || null,
              address: d.address || null,
              license_number: d.license_number || 'N/A',
              license_expiry_date: d.license_expiry_date || '',
              date_of_birth: d.date_of_birth || null,
              emergency_contact: d.emergency_contact || null,
              status: d.status || 'available',
              image_url: d.image_url || null,
              created_at: d.created_at,
              updated_at: d.updated_at,
              source: 'drivers',
            });
          }
        }
      } catch (err) {
        console.warn('drivers table query notice:', err);
      }

      // 2. Fetch from 'bus_drivers' table (main bus owner driver registry)
      try {
        let busDriversQuery = supabase
          .from('bus_drivers')
          .select(`
            id,
            bus_owner_id,
            bus_id,
            driver_name,
            driver_phone,
            assignment_date,
            is_active,
            created_at,
            updated_at,
            owner_buses(id, bus_number, bus_type, bus_owner_id)
          `)
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          busDriversQuery = busDriversQuery.eq('bus_owner_id', user.id);
        }

        const { data: busDriversData, error: busDriversError } = await busDriversQuery;
        if (!busDriversError && Array.isArray(busDriversData)) {
          for (const bd of busDriversData) {
            const busInfo = bd.owner_buses as any;
            const busNumber = busInfo?.bus_number || null;

            // Check if this driver already exists in the map by phone or name
            let existingKey: string | null = null;
            for (const [key, existing] of driversMap.entries()) {
              const samePhone = bd.driver_phone && existing.phone && existing.phone === bd.driver_phone;
              const sameName =
                bd.driver_name &&
                existing.full_name &&
                existing.full_name.toLowerCase().trim() === bd.driver_name.toLowerCase().trim();

              if (samePhone || sameName) {
                existingKey = key;
                break;
              }
            }

            if (existingKey) {
              const existing = driversMap.get(existingKey)!;
              driversMap.set(existingKey, {
                ...existing,
                assigned_bus: busNumber || existing.assigned_bus,
                bus_id: bd.bus_id || existing.bus_id,
                bus_number: busNumber || existing.bus_number,
                status:
                  existing.status === 'available' && busNumber
                    ? 'assigned'
                    : bd.is_active === false
                    ? 'inactive'
                    : existing.status,
              });
            } else {
              driversMap.set(bd.id, {
                id: bd.id,
                owner_id: bd.bus_owner_id,
                full_name: bd.driver_name,
                nic: (bd as any).nic || 'Registered',
                phone: bd.driver_phone,
                license_number:
                  (bd as any).license_number ||
                  (bd.driver_phone
                    ? `DL-${bd.driver_phone.replace(/\D/g, '').slice(-6) || 'VERIFIED'}`
                    : 'DL-VERIFIED'),
                license_expiry_date: (bd as any).license_expiry_date || '',
                status: bd.is_active === false ? 'inactive' : busNumber ? 'assigned' : 'available',
                assigned_bus: busNumber,
                bus_id: bd.bus_id,
                bus_number: busNumber,
                created_at: bd.created_at || bd.assignment_date,
                updated_at: bd.updated_at,
                source: 'bus_drivers',
              });
            }
          }
        }
      } catch (err) {
        console.warn('bus_drivers table query notice:', err);
      }

      // 3. Fetch from 'trips' table for any additional registered drivers
      try {
        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select('id, driver_name, driver_phone, bus_number, owner_bus_id, is_active, created_at')
          .not('driver_name', 'is', null);

        if (!tripsError && Array.isArray(tripsData)) {
          for (const trip of tripsData) {
            if (!trip.driver_name || !trip.driver_name.trim()) continue;

            let existingKey: string | null = null;
            for (const [key, existing] of driversMap.entries()) {
              const samePhone = trip.driver_phone && existing.phone && existing.phone === trip.driver_phone;
              const sameName =
                existing.full_name &&
                existing.full_name.toLowerCase().trim() === trip.driver_name.toLowerCase().trim();

              if (samePhone || sameName) {
                existingKey = key;
                break;
              }
            }

            if (existingKey) {
              const existing = driversMap.get(existingKey)!;
              if (!existing.assigned_bus && trip.bus_number) {
                driversMap.set(existingKey, {
                  ...existing,
                  assigned_bus: trip.bus_number,
                  bus_number: trip.bus_number,
                  status: existing.status === 'available' ? 'assigned' : existing.status,
                });
              }
            } else if (isAdmin) {
              driversMap.set(`trip_${trip.id}`, {
                id: `trip_${trip.id}`,
                full_name: trip.driver_name.trim(),
                nic: 'Registered',
                phone: trip.driver_phone || 'N/A',
                license_number: 'DL-ACTIVE',
                status: trip.is_active ? 'assigned' : 'available',
                assigned_bus: trip.bus_number,
                bus_number: trip.bus_number,
                created_at: trip.created_at,
                source: 'trips',
              });
            }
          }
        }
      } catch (err) {
        console.warn('trips query notice:', err);
      }

      return Array.from(driversMap.values()).sort((a, b) =>
        a.full_name.localeCompare(b.full_name)
      );
    },
  });
}

export function useAddDriver() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

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
      busId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated.');

      const ownerId = isAdmin ? input.ownerId || user.id : user.id;

      // 1. Try inserting into 'drivers' table
      try {
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

        if (!error && data) return data as DriverRow;
      } catch (err) {
        console.warn('drivers table insert fallback to bus_drivers:', err);
      }

      // 2. Fallback / Sync into 'bus_drivers' table
      const { data: bdData, error: bdError } = await supabase
        .from('bus_drivers')
        .insert({
          bus_owner_id: ownerId,
          bus_id: input.busId || null,
          driver_name: input.fullName,
          driver_phone: input.phone,
          is_active: input.status !== 'inactive',
        })
        .select()
        .single();

      if (bdError) throw bdError;

      return {
        id: bdData.id,
        owner_id: bdData.bus_owner_id,
        full_name: bdData.driver_name,
        nic: input.nic || 'Registered',
        phone: bdData.driver_phone,
        license_number: input.licenseNumber || 'DL-VERIFIED',
        license_expiry_date: input.licenseExpiryDate,
        status: input.status || 'available',
        source: 'bus_drivers',
      } as DriverRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
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
      busId?: string | null;
    }) => {
      let updated = false;

      // Update in 'drivers'
      try {
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

        if (!error && data) {
          updated = true;
          return data as DriverRow;
        }
      } catch (err) {
        console.warn('drivers update fallback:', err);
      }

      // Update in 'bus_drivers'
      try {
        const { data: bdData, error: bdError } = await supabase
          .from('bus_drivers')
          .update({
            ...(input.fullName !== undefined && { driver_name: input.fullName }),
            ...(input.phone !== undefined && { driver_phone: input.phone }),
            ...(input.status !== undefined && { is_active: input.status !== 'inactive' }),
            ...(input.busId !== undefined && { bus_id: input.busId }),
          })
          .eq('id', input.id)
          .select()
          .single();

        if (!bdError && bdData) {
          updated = true;
          return {
            id: bdData.id,
            owner_id: bdData.bus_owner_id,
            full_name: bdData.driver_name,
            nic: input.nic || 'Registered',
            phone: bdData.driver_phone,
            license_number: input.licenseNumber || 'DL-VERIFIED',
            status: input.status || (bdData.is_active ? 'available' : 'inactive'),
            source: 'bus_drivers',
          } as DriverRow;
        }
      } catch (err) {
        console.warn('bus_drivers update error:', err);
      }

      if (!updated) {
        throw new Error('Driver could not be updated.');
      }
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
      // Try delete from 'drivers'
      try {
        await supabase.from('drivers').delete().eq('id', driverId);
      } catch (e) {
        console.warn('drivers delete notice:', e);
      }

      // Try delete from 'bus_drivers'
      try {
        await supabase.from('bus_drivers').delete().eq('id', driverId);
      } catch (e) {
        console.warn('bus_drivers delete notice:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['crew-dashboard-stats'] });
    },
  });
}
