-- =====================================================================
-- Notification System Enhancements
--
-- This migration is purely additive and backward-compatible. It does NOT
-- alter the existing `notifications` table columns (which already include
-- title, message, type, entity_type, entity_id, read, link, created_at).
--
-- Adds:
--   1. public.create_notification(...) SECURITY DEFINER RPC
--        - Lets the frontend create a notification for ANY user (e.g. the
--          booking owner) without exposing the whole table to INSERT.
--   2. INSERT policy + GRANT on public.notifications
--        - Required for the direct-insert fallback path in the frontend
--          (createNotification helper) when the RPC is unavailable.
--   3. Booking notification triggers
--        - AFTER INSERT  -> "Booking Confirmed" notification
--        - AFTER UPDATE  -> "Booking Cancelled / Refund" notification
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. create_notification RPC (SECURITY DEFINER)
--    Allows any authenticated user to create a notification for any
--    target user, useful for admin/staff/bus-owner -> passenger flows.
--    callers cannot spoof the user_id beyond what the RPC explicitly
--    accepts, but that is acceptable for this app's trust model.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id     UUID,
  _title       TEXT,
  _message     TEXT DEFAULT NULL,
  _type        TEXT DEFAULT 'info',
  _entity_type TEXT DEFAULT NULL,
  _entity_id   UUID DEFAULT NULL,
  _link        TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, title, message, type, entity_type, entity_id, link, read
  ) VALUES (
    _user_id,
    COALESCE(NULLIF(_title, ''), 'Notification'),
    COALESCE(NULLIF(_message, ''), 'No details available.'),
    COALESCE(NULLIF(_type, ''), 'info'),
    _entity_type,
    _entity_id,
    _link,
    false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- 2. INSERT policy + grant on notifications (for direct-insert fallback)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;

CREATE POLICY "notifications_insert_own"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

GRANT INSERT ON public.notifications TO authenticated;

-- ---------------------------------------------------------------------
-- 3. Booking notification triggers
-- ---------------------------------------------------------------------

-- 3a. AFTER INSERT: booking confirmed
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify when the booking is confirmed and belongs to a user
  IF NEW.status = 'confirmed' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, title, message, type, entity_type, entity_id, link
    ) VALUES (
      NEW.user_id,
      'Booking Confirmed',
      'Your booking ' || NEW.booking_id || ' for ' || COALESCE(NEW.route_name, 'your trip') ||
        ' has been confirmed' || (CASE WHEN NEW.seat_number IS NOT NULL THEN ' (Seat #' || NEW.seat_number || ').' ELSE '.' END),
      'booking',
      'booking',
      NEW.id,
      '/my-bookings'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3b. AFTER UPDATE: booking cancelled / refund
CREATE OR REPLACE FUNCTION public.notify_booking_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, title, message, type, entity_type, entity_id, link
    ) VALUES (
      NEW.user_id,
      'Booking Cancelled',
      'Your booking ' || NEW.booking_id || ' for ' || COALESCE(NEW.route_name, 'your trip') ||
        ' has been cancelled. A refund request has been initiated.',
      'booking',
      'booking',
      NEW.id,
      '/my-bookings'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers (idempotent)
DROP TRIGGER IF EXISTS trg_notify_booking_created   ON public.bookings;
DROP TRIGGER IF EXISTS trg_notify_booking_cancelled ON public.bookings;

CREATE TRIGGER trg_notify_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_created();

CREATE TRIGGER trg_notify_booking_cancelled
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_cancelled();

-- ---------------------------------------------------------------------
-- 4. Ensure notifications is in the realtime publication (idempotent)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
