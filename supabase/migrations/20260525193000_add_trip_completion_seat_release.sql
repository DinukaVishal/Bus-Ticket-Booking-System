-- Allow seats to be reused after a ticket is completed/cancelled.
-- The old unique constraint blocked a route/date/seat forever, even when status
-- was no longer active.

ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_route_id_date_seat_number_key;

ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_status_check
CHECK (status IN ('confirmed', 'cancelled', 'completed'));

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id);

-- Clean up legacy double-booked active seats before enforcing the partial
-- unique index. We keep the earliest confirmed booking and cancel later
-- duplicates for the same route/date/seat.
WITH ranked_confirmed_bookings AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY route_id, date, seat_number
      ORDER BY created_at ASC, id ASC
    ) AS seat_rank
  FROM public.bookings
  WHERE status = 'confirmed'
),
duplicate_confirmed_bookings AS (
  SELECT id
  FROM ranked_confirmed_bookings
  WHERE seat_rank > 1
)
UPDATE public.bookings b
SET status = 'cancelled'
FROM duplicate_confirmed_bookings d
WHERE b.id = d.id;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_seat_unique
ON public.bookings (route_id, date, seat_number)
WHERE status = 'confirmed';

CREATE OR REPLACE FUNCTION public.complete_ticket_trip(_booking_ids TEXT[])
RETURNS TABLE(
  booking_id TEXT,
  seat_number INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_count INTEGER;
  matched_count INTEGER;
  inactive_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins/conductors can complete scanned tickets';
  END IF;

  SELECT COUNT(DISTINCT id)
  INTO requested_count
  FROM unnest(_booking_ids) AS requested(id)
  WHERE id IS NOT NULL AND btrim(id) <> '';

  IF requested_count = 0 THEN
    RAISE EXCEPTION 'No booking IDs provided';
  END IF;

  SELECT COUNT(*)
  INTO matched_count
  FROM public.bookings b
  WHERE b.booking_id = ANY(_booking_ids);

  IF matched_count <> requested_count THEN
    RAISE EXCEPTION 'One or more tickets were not found';
  END IF;

  SELECT COUNT(*)
  INTO inactive_count
  FROM public.bookings b
  WHERE b.booking_id = ANY(_booking_ids)
    AND b.status <> 'confirmed';

  IF inactive_count > 0 THEN
    RAISE EXCEPTION 'One or more tickets are already cancelled or completed';
  END IF;

  RETURN QUERY
  UPDATE public.bookings b
  SET
    status = 'completed',
    completed_at = now(),
    completed_by = auth.uid()
  WHERE b.booking_id = ANY(_booking_ids)
    AND b.status = 'confirmed'
  RETURNING b.booking_id, b.seat_number, b.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_ticket_trip(TEXT[]) TO authenticated;
