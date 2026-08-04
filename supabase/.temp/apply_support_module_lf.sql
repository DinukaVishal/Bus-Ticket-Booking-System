-- =====================================================================
-- Consolidate support module + required helpers for the remote DB.
-- Safe to run repeatedly (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Ensure 'staff' role exists in app_role enum (idempotent)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'staff'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'staff';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- is_staff helper (needed by the support RLS policies)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'staff'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated;

-- =====================================================================
-- Support system (20260521_add_support_system.sql)
-- =====================================================================

-- 1. support_categories table
CREATE TABLE IF NOT EXISTS public.support_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. support_tickets table
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq START 1000;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number     TEXT NOT NULL UNIQUE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category          TEXT NOT NULL,
  subject           TEXT NOT NULL,
  description       TEXT NOT NULL,
  priority          TEXT NOT NULL DEFAULT 'Medium'
                    CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status            TEXT NOT NULL DEFAULT 'Open'
                    CHECK (status IN ('Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed', 'Escalated')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ
);

-- 3. support_messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message        TEXT NOT NULL,
  attachment_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. support_ticket_notes table
CREATE TABLE IF NOT EXISTS public.support_ticket_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. support_ticket_events table
CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ticket_ratings table
CREATE TABLE IF NOT EXISTS public.ticket_ratings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL UNIQUE REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT NOT NULL DEFAULT 'info',
  entity_type TEXT,
  entity_id   UUID,
  read        BOOLEAN NOT NULL DEFAULT false,
  link        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id          ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_staff   ON public.support_tickets (assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status           ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority         ON public.support_tickets (priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category         ON public.support_tickets (category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at       ON public.support_tickets (created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id       ON public.support_messages (ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_notes_ticket_id          ON public.support_ticket_notes (ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_events_ticket_id         ON public.support_ticket_events (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ratings_ticket_id                ON public.ticket_ratings (ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id            ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read               ON public.notifications (user_id, read);

-- 9. Default categories
INSERT INTO public.support_categories (name, description) VALUES
  ('Booking Issue',    'Problems related to ticket booking and reservations'),
  ('Payment Problem',  'Issues with payments, transactions, and refunds'),
  ('Refund Request',   'Requests for refunds on cancelled or failed bookings'),
  ('Bus Delay',        'Delays in bus departures or arrivals'),
  ('Seat Issue',       'Problems with seat selection, layout, or comfort'),
  ('Technical Problem','Technical issues with the website or mobile app'),
  ('Account Issue',    'Problems with login, registration, or profile'),
  ('Complaint',        'General complaints about service'),
  ('Suggestion',       'Ideas and suggestions for improvement'),
  ('Other',            'Anything else not covered by other categories')
ON CONFLICT (name) DO NOTHING;

-- 10. Enable RLS
ALTER TABLE public.support_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_ratings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;

-- 11. can_access_ticket helper
CREATE OR REPLACE FUNCTION public.can_access_ticket(_ticket_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = _ticket_id
      AND (
        t.user_id = _user_id
        OR t.assigned_staff_id = _user_id
        OR public.has_role(_user_id, 'admin'::app_role)
      )
  );
$$;

-- 12. generate_ticket_number trigger function
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_num BIGINT;
BEGIN
  seq_num := nextval('public.support_ticket_number_seq');
  NEW.ticket_number := 'SUP-' || lpad(seq_num::text, 5, '0');
  RETURN NEW;
END;
$$;

-- 13. handle_ticket_status_change
CREATE OR REPLACE FUNCTION public.handle_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Resolved' AND OLD.status IS DISTINCT FROM 'Resolved' THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  ELSIF NEW.status <> 'Resolved' THEN
    NEW.resolved_at := NULL;
  END IF;

  IF NEW.status = 'Closed' AND OLD.status IS DISTINCT FROM 'Closed' THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  ELSIF NEW.status <> 'Closed' THEN
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- 14. Timeline event triggers
CREATE OR REPLACE FUNCTION public.log_ticket_created_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, description)
  VALUES (NEW.id, NEW.user_id, 'created', 'Ticket created');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_ticket_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, description)
    VALUES (NEW.id, auth.uid(), 'status_changed', 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_ticket_priority_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, description)
    VALUES (NEW.id, auth.uid(), 'priority_changed', 'Priority changed from ' || OLD.priority || ' to ' || NEW.priority);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_ticket_assignment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id THEN
    INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, description)
    VALUES (NEW.id, auth.uid(), 'assigned',
      CASE WHEN NEW.assigned_staff_id IS NULL THEN 'Ticket unassigned' ELSE 'Ticket assigned to staff' END);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_ticket_reply_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, description)
  VALUES (NEW.ticket_id, NEW.sender_id, 'reply', 'New message added');
  RETURN NEW;
END;
$$;

-- 15. Notification triggers
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, link)
  SELECT
    ur.user_id,
    'New Support Ticket',
    'Ticket ' || NEW.ticket_number || ' created: ' || NEW.subject,
    'support',
    'support_ticket',
    NEW.id,
    '/support/' || NEW.id
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::public.app_role;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_staff_id IS NOT NULL AND OLD.assigned_staff_id IS DISTINCT FROM NEW.assigned_staff_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, link)
    VALUES (
      NEW.assigned_staff_id,
      'Ticket Assigned',
      'Ticket ' || NEW.ticket_number || ' (' || NEW.subject || ') has been assigned to you.',
      'support',
      'support_ticket',
      NEW.id,
      '/support/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
BEGIN
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF v_ticket IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id <> v_ticket.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, link)
    VALUES (
      v_ticket.user_id,
      'New Reply on ' || v_ticket.ticket_number,
      'Support responded to your ticket: ' || v_ticket.subject,
      'support',
      'support_ticket',
      v_ticket.id,
      '/support/' || v_ticket.id
    );
  END IF;

  IF v_ticket.assigned_staff_id IS NOT NULL AND NEW.sender_id = v_ticket.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, link)
    VALUES (
      v_ticket.assigned_staff_id,
      'New Reply on ' || v_ticket.ticket_number,
      'A customer replied to ticket ' || v_ticket.ticket_number || '.',
      'support',
      'support_ticket',
      v_ticket.id,
      '/support/' || v_ticket.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, link)
    VALUES (
      NEW.user_id,
      'Ticket Status Updated',
      'Ticket ' || NEW.ticket_number || ' status changed to ' || NEW.status || '.',
      'support',
      'support_ticket',
      NEW.id,
      '/support/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 16. Attach triggers
DROP TRIGGER IF EXISTS trg_support_ticket_number        ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_status        ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_updated_at    ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_created_event ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_status_event  ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_priority_event ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_assign_event  ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_notify_created       ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_notify_assigned      ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_notify_status        ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_message_event        ON public.support_messages;
DROP TRIGGER IF EXISTS trg_support_message_notify       ON public.support_messages;

CREATE TRIGGER trg_support_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

CREATE TRIGGER trg_support_ticket_status
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_status_change();

CREATE TRIGGER trg_support_ticket_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_support_ticket_created_event
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_created_event();

CREATE TRIGGER trg_support_ticket_status_event
  AFTER UPDATE OF status ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_status_event();

CREATE TRIGGER trg_support_ticket_priority_event
  AFTER UPDATE OF priority ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_priority_event();

CREATE TRIGGER trg_support_ticket_assign_event
  AFTER UPDATE OF assigned_staff_id ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_assignment_event();

CREATE TRIGGER trg_support_notify_created
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_created();

CREATE TRIGGER trg_support_notify_assigned
  AFTER UPDATE OF assigned_staff_id ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_assigned();

CREATE TRIGGER trg_support_notify_status
  AFTER UPDATE OF status ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_status_changed();

CREATE TRIGGER trg_support_message_event
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_reply_event();

CREATE TRIGGER trg_support_message_notify
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_reply();

-- 17. RLS Policies
DROP POLICY IF EXISTS "support_categories_select"     ON public.support_categories;
DROP POLICY IF EXISTS "support_categories_admin_all"  ON public.support_categories;
CREATE POLICY "support_categories_select"
  ON public.support_categories FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "support_categories_admin_all"
  ON public.support_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "support_tickets_owner_select"  ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_owner_insert"  ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_owner_update"  ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_staff_select"  ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_staff_update"  ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_admin_all"     ON public.support_tickets;
CREATE POLICY "support_tickets_owner_select"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "support_tickets_owner_insert"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "support_tickets_owner_update"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "support_tickets_staff_select"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (assigned_staff_id = auth.uid());
CREATE POLICY "support_tickets_staff_update"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (assigned_staff_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (assigned_staff_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "support_tickets_admin_all"
  ON public.support_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "support_messages_select" ON public.support_messages;
DROP POLICY IF EXISTS "support_messages_insert" ON public.support_messages;
CREATE POLICY "support_messages_select"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.user_id = auth.uid()
          OR t.assigned_staff_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );
CREATE POLICY "support_messages_insert"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.user_id = auth.uid()
          OR t.assigned_staff_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

DROP POLICY IF EXISTS "support_notes_select" ON public.support_ticket_notes;
DROP POLICY IF EXISTS "support_notes_insert" ON public.support_ticket_notes;
CREATE POLICY "support_notes_select"
  ON public.support_ticket_notes FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "support_notes_insert"
  ON public.support_ticket_notes FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  );

DROP POLICY IF EXISTS "support_events_select" ON public.support_ticket_events;
CREATE POLICY "support_events_select"
  ON public.support_ticket_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.user_id = auth.uid()
          OR t.assigned_staff_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

DROP POLICY IF EXISTS "ratings_select" ON public.ticket_ratings;
DROP POLICY IF EXISTS "ratings_insert" ON public.ticket_ratings;
CREATE POLICY "ratings_select"
  ON public.ticket_ratings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "ratings_insert"
  ON public.ticket_ratings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 18. Analytics RPC
CREATE OR REPLACE FUNCTION public.get_support_analytics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result  JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  IF public.has_role(v_user_id, 'admin'::app_role) THEN
    SELECT jsonb_build_object(
      'total_tickets',
        (SELECT count(*) FROM public.support_tickets),
      'open_tickets',
        (SELECT count(*) FROM public.support_tickets WHERE status NOT IN ('Resolved', 'Closed')),
      'resolved_today',
        (SELECT count(*) FROM public.support_tickets WHERE resolved_at::date = CURRENT_DATE),
      'avg_resolution_hours',
        (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 1), 0)
           FROM public.support_tickets WHERE resolved_at IS NOT NULL),
      'critical_tickets',
        (SELECT count(*) FROM public.support_tickets WHERE priority = 'Critical' AND status NOT IN ('Resolved', 'Closed')),
      'by_category',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', category, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
           FROM (SELECT category, count(*) AS cnt FROM public.support_tickets GROUP BY category) c),
      'by_status',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', status, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
           FROM (SELECT status, count(*) AS cnt FROM public.support_tickets GROUP BY status) s),
      'by_priority',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', priority, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
           FROM (SELECT priority, count(*) AS cnt FROM public.support_tickets GROUP BY priority) p),
      'monthly_tickets',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('month', month, 'count', cnt) ORDER BY month), '[]'::jsonb)
           FROM (SELECT to_char(created_at, 'YYYY-MM') AS month, count(*) AS cnt
                 FROM public.support_tickets GROUP BY month ORDER BY month DESC LIMIT 12) m),
      'staff_performance',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'staff_id', assigned_staff_id,
             'total', total_cnt,
             'resolved', resolved_cnt) ORDER BY resolved_cnt DESC), '[]'::jsonb)
           FROM (

