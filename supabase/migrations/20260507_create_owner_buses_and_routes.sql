-- Create owner-related tables if they don't exist
-- This migration ensures owner_buses and owner_routes tables exist with correct schema

-- Step 1: Create owner_buses table if it doesn't exist
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

-- Step 2: Create owner_routes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.owner_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
  owner_bus_id UUID REFERENCES public.owner_buses(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bus_owner_id, route_id, owner_bus_id)
);

-- Step 3: Enable RLS on tables if not already enabled
ALTER TABLE IF EXISTS public.owner_buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.owner_routes ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Bus owners can view their buses" ON public.owner_buses;
DROP POLICY IF EXISTS "Bus owners can manage their buses" ON public.owner_buses;
DROP POLICY IF EXISTS "Admins can manage all buses" ON public.owner_buses;
DROP POLICY IF EXISTS "Bus owners can view their routes" ON public.owner_routes;
DROP POLICY IF EXISTS "Bus owners can manage their routes" ON public.owner_routes;
DROP POLICY IF EXISTS "Admins can manage all routes" ON public.owner_routes;

-- Step 5: Create RLS policies for owner_buses
CREATE POLICY "Bus owners can view their buses"
  ON public.owner_buses FOR SELECT TO authenticated
  USING (auth.uid() = bus_owner_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bus owners can manage their buses"
  ON public.owner_buses FOR ALL TO authenticated
  USING (auth.uid() = bus_owner_id);

CREATE POLICY "Admins can manage all buses"
  ON public.owner_buses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 6: Create RLS policies for owner_routes
CREATE POLICY "Bus owners can view their routes"
  ON public.owner_routes FOR SELECT TO authenticated
  USING (auth.uid() = bus_owner_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bus owners can manage their routes"
  ON public.owner_routes FOR ALL TO authenticated
  USING (auth.uid() = bus_owner_id);

CREATE POLICY "Admins can manage all routes"
  ON public.owner_routes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 7: Ensure bus_locations table has bus_owner_id column (rename or add)
DO $$
BEGIN
  -- Check if driver_user_id exists and rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bus_locations' AND column_name = 'driver_user_id'
  ) THEN
    ALTER TABLE public.bus_locations RENAME COLUMN driver_user_id TO bus_owner_id;
  END IF;
  
  -- If bus_owner_id doesn't exist, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bus_locations' AND column_name = 'bus_owner_id'
  ) THEN
    ALTER TABLE public.bus_locations ADD COLUMN bus_owner_id UUID;
  END IF;
END $$;
