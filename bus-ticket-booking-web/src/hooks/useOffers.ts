import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Offer {
  id: string;
  owner_bus_id: string;
  route_id?: string | null;
  code: string;
  title: string;
  description?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  bus_owner_id?: string | null;
  route_name?: string | null;
  from_city?: string | null;
  to_city?: string | null;
}

export function useOffers(publicOnly = true) {
  return useQuery({
    queryKey: ['offers', publicOnly ? 'public' : 'all'],
    queryFn: async (): Promise<Offer[]> => {
      if (publicOnly) {
        const { data, error } = await supabase.from('public_offers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as Offer[];
      }

      const { data, error } = await supabase.from('offers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Offer[];
    },
  });
}

export function useOffersByBus(busId: string) {
  return useQuery({
    queryKey: ['offers', 'bus', busId],
    queryFn: async (): Promise<Offer[]> => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('owner_bus_id', busId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Offer[];
    },
  });
}

export function useAddOffer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (offer: Partial<Offer>) => {
      const { data, error } = await supabase.from('offers').insert(offer).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] });
    },
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('offers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] });
    },
  });
}
