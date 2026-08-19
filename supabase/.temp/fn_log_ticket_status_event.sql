CREATE OR REPLACE FUNCTION public.log_ticket_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, description)
    VALUES (NEW.id, auth.uid(), 'status_changed', 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$fn$;

