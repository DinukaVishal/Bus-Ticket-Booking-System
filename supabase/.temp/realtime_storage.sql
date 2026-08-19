ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ticket_attachments_upload" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_read"   ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_delete" ON storage.objects;

CREATE POLICY "ticket_attachments_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "ticket_attachments_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = (storage.foldername(name))[1]::uuid
          AND (t.user_id = auth.uid() OR t.assigned_staff_id = auth.uid())
      )
    )
  );

CREATE POLICY "ticket_attachments_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

