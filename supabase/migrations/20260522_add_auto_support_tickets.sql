-- =====================================================================
-- Automatic Support Ticket Generation
--
-- Adds:
--   - booking_id + source columns on support_tickets (system vs user)
--   - support_settings table (configurable bus delay threshold, etc.)
--   - auto_create_support_ticket() SECURITY DEFINER RPC with
--     duplicate-prevention and user notification integration
--
-- Backward compatible: existing support module behaviour is unchanged.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extend support_tickets with related booking + source
-- ---------------------------------------------------------------------
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS booking_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user'
    CHECK (source IN ('user', 'system'));

CREATE INDEX IF NOT EXISTS idx_support_tickets_booking_id ON public.support_tickets (booking_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_source     ON public.support_tickets (source);

-- ---------------------------------------------------------------------
-- 2. support_settings table (configurable system settings)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.support_settings (key, value) VALUES
  ('bus_delay_threshold_minutes', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. RLS + grants for support_settings
-- ---------------------------------------------------------------------
ALTER TABLE public.support_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_settings_select"      ON public.support_settings;
DROP POLICY IF EXISTS "support_settings_admin_update" ON public.support_settings;

CREATE POLICY "support_settings_select"
  ON public.support_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "support_settings_admin_update"
  ON public.support_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, UPDATE ON public.support_settings TO authenticated;

-- ---------------------------------------------------------------------
-- 4. auto_create_support_ticket RPC
--
--    Creates a support ticket as a SYSTEM-generated ticket (source =
--    'system'), bypassing the normal "user_id must equal auth.uid()"
--    RLS restriction so it can represent events on behalf of any user.
--
--    Duplicate prevention: only ONE open ticket is allowed per
--    (user, category, booking) combination.  If an open system ticket
--    already exists, it is returned instead of creating a new one.
--
--    Falls back to the booking owner when _user_id is not supplied and
--    to auth.uid() when neither can be resolved.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_create_support_ticket(
  _category    TEXT,
  _subject     TEXT,
  _description TEXT,
  _priority    TEXT DEFAULT 'Medium',
  _booking_id  TEXT DEFAULT NULL,
  _user_id     UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := _user_id;
  v_booking_id TEXT := NULLIF(_booking_id, '');
  v_existing   UUID;
  v_ticket     public.support_tickets%ROWTYPE;
  v_priority   TEXT := _priority;
BEGIN
  -- Resolve the ticket owner: explicit user -> booking owner -> caller
  IF v_user_id IS NULL AND v_booking_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM public.bookings
    WHERE booking_id = v_booking_id
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Could not determine a user for this support ticket.',
      'created', false
    );
  END IF;

  -- Validate / sanitize priority
  IF v_priority NOT IN ('Low', 'Medium', 'High', 'Critical') THEN
    v_priority := 'Medium';
  END IF;

  -- Duplicate prevention: reuse any open SYSTEM ticket for this
  -- user + category + booking so we never spam the same issue.
  SELECT t.id INTO v_existing
  FROM public.support_tickets t
  WHERE t.user_id = v_user_id
    AND t.category = _category
    AND t.source = 'system'
    AND t.status NOT IN ('Resolved', 'Closed')
    AND t.booking_id IS NOT DISTINCT FROM v_booking_id
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_ticket FROM public.support_tickets WHERE id = v_existing;
    RETURN jsonb_build_object(
      'id',            v_ticket.id,
      'ticket_number', v_ticket.ticket_number,
      'created',       false,
      'reason',        'An open ticket already exists for this booking and category.'
    );
  END IF;

  -- Create the system ticket
  INSERT INTO public.support_tickets (
    user_id, category, subject, description, priority, booking_id, source
  ) VALUES (
    v_user_id, _category, _subject, _description, v_priority, v_booking_id, 'system'
  )
  RETURNING * INTO v_ticket;

  -- Notify the affected user (existing triggers handle admin/staff alerts)
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, link)
  VALUES (
    v_user_id,
    'Support ticket auto-created',
    'Ticket ' || v_ticket.ticket_number || ' (' || v_ticket.category || '): ' || v_ticket.subject,
    'support',
    'support_ticket',
    v_ticket.id,
    '/support/' || v_ticket.id
  );

  RETURN jsonb_build_object(
    'id',            v_ticket.id,
    'ticket_number', v_ticket.ticket_number,
    'created',       true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_create_support_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

