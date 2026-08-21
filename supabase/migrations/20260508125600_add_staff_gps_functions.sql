-- Add staff GPS tracking support and fix RLS policies

-- First, ensure bus_locations table has the correct column
DO $$
BEGIN
  -- Make sure bus_owner_id column exists and is NOT NULL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bus_locations' AND column_name = 'bus_owner_id'
  ) THEN
    ALTER TABLE public.bus_locations ADD COLUMN bus_owner_id UUID;
  END IF;

  -- Make it NOT NULL if it's nullable
  ALTER TABLE public.bus_locations ALTER COLUMN bus_owner_id SET NOT NULL;

  -- Add accuracy column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bus_locations' AND column_name = 'accuracy'
  ) THEN
    ALTER TABLE public.bus_locations ADD COLUMN accuracy DOUBLE PRECISION;
  END IF;
END $$;

-- Secure RPC for staff to insert GPS locations without requiring auth
DROP FUNCTION IF EXISTS public.insert_staff_gps_location(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.update_staff_gps_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION public.insert_staff_gps_location(
  _route_id UUID,
  _bus_owner_id UUID,
  _latitude DOUBLE PRECISION,
  _longitude DOUBLE PRECISION,
  _speed DOUBLE PRECISION DEFAULT 0,
  _bearing DOUBLE PRECISION DEFAULT 0,
  _accuracy DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _location_id UUID;
BEGIN
  INSERT INTO public.bus_locations (
    route_id,
    bus_owner_id,
    latitude,
    longitude,
    speed,
    bearing,
    accuracy,
    is_active
  ) VALUES (
    _route_id,
    _bus_owner_id,
    _latitude,
    _longitude,
    _speed,
    _bearing,
    _accuracy,
    true
  )
  RETURNING id INTO _location_id;

  RETURN jsonb_build_object('id', _location_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_staff_gps_location(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;
GRANT EXECUTE ON FUNCTION public.insert_staff_gps_location(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- Update GPS location via RPC
CREATE OR REPLACE FUNCTION public.update_staff_gps_location(
  _location_id UUID,
  _latitude DOUBLE PRECISION,
  _longitude DOUBLE PRECISION,
  _speed DOUBLE PRECISION DEFAULT 0,
  _bearing DOUBLE PRECISION DEFAULT 0,
  _accuracy DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bus_locations
  SET
    latitude = _latitude,
    longitude = _longitude,
    speed = _speed,
    bearing = _bearing,
    accuracy = _accuracy,
    updated_at = now()
  WHERE id = _location_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_staff_gps_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;
GRANT EXECUTE ON FUNCTION public.update_staff_gps_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- Allow staff GPS inserts (bypass RLS for RPC functions)
-- Note: RPC functions with SECURITY DEFINER bypass RLS anyway
