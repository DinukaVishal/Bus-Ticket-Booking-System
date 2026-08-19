CREATE OR REPLACE FUNCTION public.log_ticket_reply_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.support_ticket_events (ticket_id, actor_id, event_type, description)
  VALUES (NEW.ticket_id, NEW.sender_id, 'reply', 'New message added');
  RETURN NEW;
END;
$fn$;

