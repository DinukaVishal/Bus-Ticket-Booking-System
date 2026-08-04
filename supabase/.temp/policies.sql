-- ============ support_categories ============
DROP POLICY IF EXISTS "support_categories_select"     ON public.support_categories;
DROP POLICY IF EXISTS "support_categories_admin_all"  ON public.support_categories;

CREATE POLICY "support_categories_select"
  ON public.support_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "support_categories_admin_all"
  ON public.support_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ support_tickets ============
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

-- ============ support_messages ============
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

-- ============ support_ticket_notes (internal - staff/admin only) ============
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

-- ============ support_ticket_events ============
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

-- ============ ticket_ratings ============
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

-- ============ notifications ============
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============ support_settings ============
DROP POLICY IF EXISTS "support_settings_select"      ON public.support_settings;
DROP POLICY IF EXISTS "support_settings_admin_update" ON public.support_settings;

CREATE POLICY "support_settings_select"
  ON public.support_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "support_settings_admin_update"
  ON public.support_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

