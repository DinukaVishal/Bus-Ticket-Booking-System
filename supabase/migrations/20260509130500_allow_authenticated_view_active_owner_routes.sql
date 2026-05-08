-- Allow authenticated users to view active owner route assignments

ALTER TABLE IF EXISTS public.owner_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active owner routes" ON public.owner_routes;

CREATE POLICY "Authenticated users can view active owner routes"
  ON public.owner_routes FOR SELECT TO authenticated
  USING (is_active = true);