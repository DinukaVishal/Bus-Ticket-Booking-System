-- Allow bus owners to create routes as well as admins
-- This migration updates the RLS policy for public.routes so bus owners can insert new route records.

DROP POLICY IF EXISTS "Admins can create routes" ON public.routes;

CREATE POLICY "Admins and bus owners can create routes"
  ON public.routes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'bus_owner'::app_role)
  );
