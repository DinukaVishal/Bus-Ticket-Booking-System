-- Allow bus owners to insert trips for routes assigned to their own buses
-- This migration updates the RLS policy for public.trips so bus owners can save trips on their assigned routes.

DROP POLICY IF EXISTS "Bus owners can insert trips for assigned routes" ON public.trips;

CREATE POLICY "Bus owners can insert trips for assigned routes"
  ON public.trips FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.owner_routes orr
      WHERE orr.bus_owner_id = auth.uid()
        AND orr.route_id = trips.route_id
        AND orr.is_active = true
    )
  );
