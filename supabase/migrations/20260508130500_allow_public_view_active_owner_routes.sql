-- Allow public users to view active owner route assignments

ALTER TABLE IF EXISTS public.owner_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active owner routes" ON public.owner_routes;

CREATE POLICY "Anyone can view active owner routes"
  ON public.owner_routes FOR SELECT TO public
  USING (is_active = true);
