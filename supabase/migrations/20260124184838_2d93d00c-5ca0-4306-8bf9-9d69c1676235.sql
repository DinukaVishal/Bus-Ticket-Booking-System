-- ============================================
-- FIX 1: Protect customer personal data in bookings
-- Remove public SELECT policy and create secure RPC for seat availability
-- ============================================

-- Drop the public policy that exposes personal data
DROP POLICY IF EXISTS "Anyone can view booked seats for availability" ON public.bookings;

-- Create a secure RPC function that only returns seat numbers (no personal data)
CREATE OR REPLACE FUNCTION public.get_booked_seats(
  _route_id UUID,
  _date DATE
)
RETURNS TABLE(seat_number INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT seat_number
  FROM public.bookings
  WHERE route_id = _route_id
    AND date = _date
    AND status = 'confirmed'
$$;

-- Grant execute to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_booked_seats(UUID, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_booked_seats(UUID, DATE) TO authenticated;

-- ============================================
-- FIX 2: Restrict route creation to admin only
-- ============================================

-- Drop the permissive public insert policy
DROP POLICY IF EXISTS "Anyone can create routes" ON public.routes;

-- Create admin-only policies for routes management
CREATE POLICY "Admins can create routes"
ON public.routes FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update routes"
ON public.routes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete routes"
ON public.routes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX 3: Remove privilege escalation vulnerability
-- Users should NOT be able to claim admin roles
-- ============================================

-- Drop the dangerous policy that allows users to claim any role
DROP POLICY IF EXISTS "Users can claim admin role during setup" ON public.user_roles;