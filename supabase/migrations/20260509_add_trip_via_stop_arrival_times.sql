-- Add storage for intermediate stop arrival times on trips
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS via_stop_arrival_times TEXT[] DEFAULT ARRAY[]::text[];

CREATE INDEX IF NOT EXISTS idx_trips_via_stop_arrival_times ON public.trips USING GIN (via_stop_arrival_times);

-- Allow bus owners to update trips for their assigned routes
DROP POLICY IF EXISTS "Bus owners can update trips for assigned routes" ON public.trips;
CREATE POLICY "Bus owners can update trips for assigned routes"
  ON public.trips FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.owner_routes orr
      WHERE orr.bus_owner_id = auth.uid()
        AND orr.route_id = public.trips.route_id
        AND orr.is_active = true
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.owner_routes orr
      WHERE orr.bus_owner_id = auth.uid()
        AND orr.route_id = public.trips.route_id
        AND orr.is_active = true
    )
  );

-- Allow bus owners to delete trips for their assigned routes
DROP POLICY IF EXISTS "Bus owners can delete trips for assigned routes" ON public.trips;
CREATE POLICY "Bus owners can delete trips for assigned routes"
  ON public.trips FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.owner_routes orr
      WHERE orr.bus_owner_id = auth.uid()
        AND orr.route_id = public.trips.route_id
        AND orr.is_active = true
    )
  );
