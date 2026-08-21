-- Add owner_bus_id to trips table to support owner buses
-- This allows trips to be associated with owner_buses instead of driver_buses

ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS owner_bus_id UUID REFERENCES public.owner_buses(id) ON DELETE CASCADE;

-- Create index for efficient queries on owner_bus_id
CREATE INDEX IF NOT EXISTS idx_trips_owner_bus_id ON public.trips(owner_bus_id);

-- Make owner_bus_id nullable initially (old trips will not have this)
-- Drivers can continue using bus_id, owners use owner_bus_id
