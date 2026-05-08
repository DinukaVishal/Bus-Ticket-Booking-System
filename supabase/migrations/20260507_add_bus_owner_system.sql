-- Add bus_owner role to app_role enum
ALTER TYPE public.app_role ADD VALUE 'bus_owner';

-- Create bus_drivers table to store driver info assigned to buses
CREATE TABLE public.bus_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bus_id UUID REFERENCES public.driver_buses(id) ON DELETE CASCADE NOT NULL,
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  assignment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bus_conductors table to store conductor info assigned to buses
CREATE TABLE public.bus_conductors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bus_id UUID REFERENCES public.driver_buses(id) ON DELETE CASCADE NOT NULL,
  conductor_name TEXT NOT NULL,
  conductor_phone TEXT NOT NULL,
  assignment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.bus_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_conductors ENABLE ROW LEVEL SECURITY;

-- Bus drivers policies
CREATE POLICY "Bus owners can view their bus drivers"
  ON public.bus_drivers FOR SELECT TO authenticated
  USING (auth.uid() = bus_owner_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bus owners can manage their bus drivers"
  ON public.bus_drivers FOR ALL TO authenticated
  USING (auth.uid() = bus_owner_id);

CREATE POLICY "Admins can manage all bus drivers"
  ON public.bus_drivers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Bus conductors policies
CREATE POLICY "Bus owners can view their bus conductors"
  ON public.bus_conductors FOR SELECT TO authenticated
  USING (auth.uid() = bus_owner_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bus owners can manage their bus conductors"
  ON public.bus_conductors FOR ALL TO authenticated
  USING (auth.uid() = bus_owner_id);

CREATE POLICY "Admins can manage all bus conductors"
  ON public.bus_conductors FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_bus_drivers_bus_owner_id ON public.bus_drivers(bus_owner_id);
CREATE INDEX idx_bus_drivers_bus_id ON public.bus_drivers(bus_id);
CREATE INDEX idx_bus_conductors_bus_owner_id ON public.bus_conductors(bus_owner_id);
CREATE INDEX idx_bus_conductors_bus_id ON public.bus_conductors(bus_id);

-- Create triggers for updated_at
CREATE TRIGGER update_bus_drivers_updated_at
  BEFORE UPDATE ON public.bus_drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bus_conductors_updated_at
  BEFORE UPDATE ON public.bus_conductors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
