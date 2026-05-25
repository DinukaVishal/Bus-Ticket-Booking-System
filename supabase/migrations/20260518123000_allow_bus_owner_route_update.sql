-- Allow bus owners to update their own routes
-- This migration safely replaces the existing update policy for public.routes.

DROP POLICY IF EXISTS "Admins and bus owners can update routes" ON public.routes;
DROP POLICY IF EXISTS "Admins can update routes" ON public.routes;

CREATE POLICY "Admins and bus owners can update routes"
  ON public.routes FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.owner_routes orr
      WHERE orr.route_id = public.routes.id
        AND orr.bus_owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.owner_routes orr
      WHERE orr.route_id = public.routes.id
        AND orr.bus_owner_id = auth.uid()
    )
  );
