-- Add bus_id support to trips so driver trips can be associated with a specific bus
-- This enables per-bus trip management instead of route-level trips

ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES public.driver_buses(id) ON DELETE CASCADE;

-- Create index for efficient queries on bus_id
CREATE INDEX IF NOT EXISTS idx_trips_bus_id ON public.trips(bus_id);

-- Update RLS policies to allow drivers to manage trips for their buses
-- (This assumes the existing trip policies are in place from previous migrations)
