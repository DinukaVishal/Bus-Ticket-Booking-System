-- Fix bus_drivers and bus_conductors foreign keys to reference owner_buses
-- This resolves bus creation failures when bus_drivers still pointed to driver_buses

-- Ensure owner_buses exists for the new relationship
CREATE TABLE IF NOT EXISTS public.owner_buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bus_number TEXT NOT NULL,
  bus_type TEXT NOT NULL CHECK (bus_type IN ('rosa', 'luxury_ac', 'super_long', 'normal')),
  total_seats INTEGER NOT NULL,
  registration_number TEXT NOT NULL,
  insurance_expiry DATE NOT NULL,
  fitness_certificate_expiry DATE NOT NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bus_owner_id, bus_number)
);

ALTER TABLE IF EXISTS public.bus_drivers
  DROP CONSTRAINT IF EXISTS bus_drivers_bus_id_fkey;

ALTER TABLE IF EXISTS public.bus_drivers
  ADD CONSTRAINT bus_drivers_bus_id_fkey
  FOREIGN KEY (bus_id) REFERENCES public.owner_buses(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.bus_conductors
  DROP CONSTRAINT IF EXISTS bus_conductors_bus_id_fkey;

ALTER TABLE IF EXISTS public.bus_conductors
  ADD CONSTRAINT bus_conductors_bus_id_fkey
  FOREIGN KEY (bus_id) REFERENCES public.owner_buses(id) ON DELETE CASCADE;
