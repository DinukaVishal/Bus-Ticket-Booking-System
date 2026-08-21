CREATE OR REPLACE FUNCTION public.log_ticket_created_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, description)
  VALUES (NEW.id, NEW.user_id, 'created', 'Ticket created');
  RETURN NEW;
END;
$fn$;

