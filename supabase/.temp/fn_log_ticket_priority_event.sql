CREATE OR REPLACE FUNCTION public.log_ticket_priority_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, description)
    VALUES (NEW.id, auth.uid(), 'priority_changed', 'Priority changed from ' || OLD.priority || ' to ' || NEW.priority);
  END IF;
  RETURN NEW;
END;
$fn$;

