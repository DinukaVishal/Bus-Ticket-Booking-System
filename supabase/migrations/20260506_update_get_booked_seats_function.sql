-- Update get_booked_seats function to include gender information
DROP FUNCTION IF EXISTS public.get_booked_seats(UUID, DATE);

CREATE OR REPLACE FUNCTION public.get_booked_seats(
  _trip_id UUID,
  _date DATE
)
RETURNS TABLE(seat_number INTEGER, gender TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT seat_number, gender
  FROM public.bookings
  WHERE trip_id = _trip_id
    AND date = _date
    AND status = 'confirmed'
$$;

-- Grant execute to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_booked_seats(UUID, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_booked_seats(UUID, DATE) TO authenticated;