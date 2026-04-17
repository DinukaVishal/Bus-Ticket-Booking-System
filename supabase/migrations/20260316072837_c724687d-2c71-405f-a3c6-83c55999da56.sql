
-- Table to store real-time driver GPS positions
CREATE TABLE public.bus_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  bearing double precision DEFAULT 0,
  speed double precision DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bus_locations ENABLE ROW LEVEL SECURITY;

-- Anyone can view active bus locations (public tracking)
CREATE POLICY "Anyone can view bus locations"
  ON public.bus_locations FOR SELECT TO public
  USING (true);

-- Authenticated drivers can insert their own location
CREATE POLICY "Drivers can insert own location"
  ON public.bus_locations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = driver_user_id);

-- Drivers can update their own location
CREATE POLICY "Drivers can update own location"
  ON public.bus_locations FOR UPDATE TO authenticated
  USING (auth.uid() = driver_user_id);

-- Drivers can delete their own location
CREATE POLICY "Drivers can delete own location"
  ON public.bus_locations FOR DELETE TO authenticated
  USING (auth.uid() = driver_user_id);

-- Admins can manage all locations
CREATE POLICY "Admins can manage all bus locations"
  ON public.bus_locations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_locations;

-- Index for fast lookups
CREATE INDEX idx_bus_locations_route_id ON public.bus_locations(route_id);
CREATE INDEX idx_bus_locations_active ON public.bus_locations(is_active) WHERE is_active = true;
