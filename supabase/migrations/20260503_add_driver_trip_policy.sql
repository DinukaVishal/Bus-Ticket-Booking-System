-- Allow drivers to insert trips for their assigned routes
CREATE POLICY "Drivers can insert trips for assigned routes"
ON public.trips FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.driver_routes dr
    WHERE dr.driver_user_id = auth.uid()
    AND dr.route_id = trips.route_id
    AND dr.is_active = true
  )
);