import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LiveBusLocation {
  id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  bearing: number;
  speed: number;
  is_active: boolean;
  updated_at: string;
}

export function useLiveBusLocations() {
  const [locations, setLocations] = useState<LiveBusLocation[]>([]);

  useEffect(() => {
    // Fetch initial active locations
    const fetchLocations = async () => {
      const { data } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('is_active', true);
      if (data) setLocations(data as LiveBusLocation[]);
    };

    fetchLocations();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('bus_locations_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bus_locations',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLoc = payload.new as LiveBusLocation;
            if (newLoc.is_active) {
              setLocations(prev => [...prev.filter(l => l.route_id !== newLoc.route_id), newLoc]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as LiveBusLocation;
            if (!updated.is_active) {
              setLocations(prev => prev.filter(l => l.id !== updated.id));
            } else {
              setLocations(prev =>
                prev.map(l => (l.id === updated.id ? updated : l))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id: string };
            setLocations(prev => prev.filter(l => l.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return locations;
}
