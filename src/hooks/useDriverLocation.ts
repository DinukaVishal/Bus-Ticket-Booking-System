import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface DriverLocationState {
  isSharing: boolean;
  error: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

export function useDriverLocation(routeId: string | null) {
  const { user } = useAuthContext();
  const [state, setState] = useState<DriverLocationState>({
    isSharing: false,
    error: null,
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  const watchIdRef = useRef<number | null>(null);
  const locationRecordIdRef = useRef<string | null>(null);
  const lastBearingRef = useRef<number>(0);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  const startSharing = useCallback(async () => {
    if (!user || !routeId) {
      setState(s => ({ ...s, error: 'Route එකක් select කරන්න' }));
      return;
    }

    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'GPS not supported in this browser' }));
      return;
    }

    setState(s => ({ ...s, error: null, isSharing: true }));

    // Create initial record
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { data, error } = await supabase
        .from('bus_locations')
        .insert({
          route_id: routeId,
          driver_user_id: user.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed || 0,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) throw error;
      locationRecordIdRef.current = data.id;
      lastPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      setState(s => ({
        ...s,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }));
    } catch (err: any) {
      setState(s => ({ ...s, error: err.message, isSharing: false }));
      return;
    }

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed, accuracy } = pos.coords;

        let bearing = lastBearingRef.current;
        if (lastPosRef.current) {
          const dist = Math.abs(latitude - lastPosRef.current.lat) + Math.abs(longitude - lastPosRef.current.lng);
          if (dist > 0.0001) {
            bearing = calculateBearing(lastPosRef.current.lat, lastPosRef.current.lng, latitude, longitude);
            lastBearingRef.current = bearing;
          }
        }
        lastPosRef.current = { lat: latitude, lng: longitude };

        setState(s => ({ ...s, latitude, longitude, accuracy }));

        if (locationRecordIdRef.current) {
          await supabase
            .from('bus_locations')
            .update({
              latitude,
              longitude,
              bearing,
              speed: speed || 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', locationRecordIdRef.current);
        }
      },
      (err) => {
        setState(s => ({ ...s, error: err.message }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
  }, [user, routeId]);

  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (locationRecordIdRef.current) {
      await supabase
        .from('bus_locations')
        .update({ is_active: false })
        .eq('id', locationRecordIdRef.current);
      locationRecordIdRef.current = null;
    }

    lastPosRef.current = null;
    setState({ isSharing: false, error: null, latitude: null, longitude: null, accuracy: null });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (locationRecordIdRef.current) {
        supabase
          .from('bus_locations')
          .update({ is_active: false })
          .eq('id', locationRecordIdRef.current);
      }
    };
  }, []);

  return { ...state, startSharing, stopSharing };
}
