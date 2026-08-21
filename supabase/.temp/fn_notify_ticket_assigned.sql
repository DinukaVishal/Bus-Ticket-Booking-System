CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
$fn$;

