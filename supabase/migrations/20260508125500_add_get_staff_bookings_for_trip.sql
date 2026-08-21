-- Secure RPC to let staff view bookings for their bus without requiring auth

DROP FUNCTION IF EXISTS public.get_staff_bookings_for_trip(UUID, DATE);

CREATE OR REPLACE FUNCTION public.get_staff_bookings_for_trip(
  _trip_id UUID,
  _date DATE
)
RETURNS TABLE (
  seat_number INTEGER,
  passenger_name TEXT,
  phone_number TEXT,
  gender TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.seat_number,
    b.passenger_name,
    b.phone_number,
    b.gender
  FROM public.bookings b
  WHERE b.trip_id = _trip_id
    AND b.date = _date
    AND b.status = 'confirmed';
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_bookings_for_trip(UUID, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_staff_bookings_for_trip(UUID, DATE) TO authenticated;