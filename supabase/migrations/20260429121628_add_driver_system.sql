-- Add driver role to app_role enum
ALTER TYPE public.app_role ADD VALUE 'driver';

-- Create driver_profiles table for driver-specific information
CREATE TABLE public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  license_number TEXT NOT NULL,
  license_expiry DATE NOT NULL,
  phone_number TEXT NOT NULL,
  emergency_contact TEXT,
  experience_years INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_buses table for buses owned/managed by drivers
CREATE TABLE public.driver_buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bus_number TEXT NOT NULL,
  bus_type TEXT NOT NULL CHECK (bus_type IN ('rosa', 'luxury_ac', 'super_long', 'normal')),
  total_seats INTEGER NOT NULL,
  registration_number TEXT NOT NULL,
  insurance_expiry DATE NOT NULL,
  fitness_certificate_expiry DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_user_id, bus_number)
);

-- Create driver_routes table to link drivers to specific routes
CREATE TABLE public.driver_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
  bus_id UUID REFERENCES public.driver_buses(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_user_id, route_id, bus_id)
);

-- Enable RLS on new tables
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_routes ENABLE ROW LEVEL SECURITY;

-- Driver profiles policies
CREATE POLICY "Drivers can view own profile"
  ON public.driver_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Drivers can insert own profile"
  ON public.driver_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own profile"
  ON public.driver_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all driver profiles"
  ON public.driver_profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Driver buses policies
CREATE POLICY "Drivers can view own buses"
  ON public.driver_buses FOR SELECT TO authenticated
  USING (auth.uid() = driver_user_id);

CREATE POLICY "Drivers can manage own buses"
  ON public.driver_buses FOR ALL TO authenticated
  USING (auth.uid() = driver_user_id);

CREATE POLICY "Admins can manage all driver buses"
  ON public.driver_buses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Driver routes policies
CREATE POLICY "Drivers can view own routes"
  ON public.driver_routes FOR SELECT TO authenticated
  USING (auth.uid() = driver_user_id);

CREATE POLICY "Drivers can manage own routes"
  ON public.driver_routes FOR ALL TO authenticated
  USING (auth.uid() = driver_user_id);

CREATE POLICY "Admins can manage all driver routes"
  ON public.driver_routes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to assign themselves the driver role
CREATE POLICY "Users can add driver role to self"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'driver'
  );

-- Allow drivers to view bookings for their routes
CREATE POLICY "Drivers can view bookings for their routes"
  ON public.bookings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.driver_routes dr
      WHERE dr.driver_user_id = auth.uid()
        AND dr.route_id = bookings.route_id
        AND dr.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX idx_driver_profiles_user_id ON public.driver_profiles(user_id);
CREATE INDEX idx_driver_buses_driver_user_id ON public.driver_buses(driver_user_id);
CREATE INDEX idx_driver_routes_driver_user_id ON public.driver_routes(driver_user_id);
CREATE INDEX idx_driver_routes_route_id ON public.driver_routes(route_id);
CREATE INDEX idx_driver_routes_bus_id ON public.driver_routes(bus_id);

-- Update trigger for updated_at columns
CREATE TRIGGER update_driver_profiles_updated_at
  BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_buses_updated_at
  BEFORE UPDATE ON public.driver_buses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_routes_updated_at
  BEFORE UPDATE ON public.driver_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();