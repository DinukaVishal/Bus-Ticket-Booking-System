CREATE OR REPLACE FUNCTION public.log_ticket_assignment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id THEN
    INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, description)
    VALUES (NEW.id, auth.uid(), 'assigned',
      CASE WHEN NEW.assigned_staff_id IS NULL THEN 'Ticket unassigned' ELSE 'Ticket assigned to staff' END);
  END IF;
  RETURN NEW;
END;
$fn$;

