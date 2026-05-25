-- Add guest booking information and temporary seat hold support

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Allow anonymous users to create guest bookings without a linked user account
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guests can create bookings"
ON public.bookings FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Create temporary seat hold table for optimistic locking while completing bookings
CREATE TABLE IF NOT EXISTS public.seat_holds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  seat_number INTEGER NOT NULL,
  hold_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + INTERVAL '10 minutes'
);

CREATE UNIQUE INDEX IF NOT EXISTS seat_holds_active_seat_unique
ON public.seat_holds(route_id, date, seat_number)
WHERE expires_at > now();

CREATE OR REPLACE FUNCTION public.get_blocked_seats(
  _route_id UUID,
  _date DATE
)
RETURNS TABLE(seat_number INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT seat_number FROM public.bookings
  WHERE route_id = _route_id
    AND date = _date
    AND status = 'confirmed'
  UNION
  SELECT seat_number FROM public.seat_holds
  WHERE route_id = _route_id
    AND date = _date
    AND expires_at > now()
$$;

CREATE OR REPLACE FUNCTION public.hold_seats(
  _route_id UUID,
  _date DATE,
  _seat_numbers INTEGER[],
  _hold_token TEXT
)
RETURNS TABLE(seat_number INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seat INTEGER;
  existing INTEGER;
BEGIN
  FOR seat IN SELECT unnest(_seat_numbers)
  LOOP
    IF EXISTS(
      SELECT 1 FROM public.bookings
      WHERE route_id = _route_id
        AND date = _date
        AND seat_number = seat
        AND status = 'confirmed'
    ) THEN
      RAISE EXCEPTION 'Seat % is already booked', seat;
    END IF;

    IF EXISTS(
      SELECT 1 FROM public.seat_holds
      WHERE route_id = _route_id
        AND date = _date
        AND seat_number = seat
        AND expires_at > now()
        AND hold_token <> _hold_token
    ) THEN
      RAISE EXCEPTION 'Seat % is already held', seat;
    END IF;
  END LOOP;

  INSERT INTO public.seat_holds(route_id, date, seat_number, hold_token, expires_at)
  SELECT _route_id, _date, unnest(_seat_numbers), _hold_token, now() + INTERVAL '10 minutes'
  ON CONFLICT ON CONSTRAINT seat_holds_active_seat_unique
  DO UPDATE SET
    hold_token = EXCLUDED.hold_token,
    expires_at = EXCLUDED.expires_at
  WHERE public.seat_holds.expires_at <= now();

  RETURN QUERY
  SELECT seat_number FROM public.seat_holds
  WHERE route_id = _route_id
    AND date = _date
    AND hold_token = _hold_token
    AND expires_at > now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_blocked_seats(UUID, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_blocked_seats(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hold_seats(UUID, DATE, INTEGER[], TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.hold_seats(UUID, DATE, INTEGER[], TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.release_hold(
  _hold_token TEXT
)
RETURNS VOID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.seat_holds
  WHERE hold_token = _hold_token;
$$;

GRANT EXECUTE ON FUNCTION public.release_hold(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.release_hold(TEXT) TO authenticated;
