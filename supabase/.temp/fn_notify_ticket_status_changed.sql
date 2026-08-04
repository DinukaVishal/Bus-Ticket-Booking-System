CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
$fn$;

