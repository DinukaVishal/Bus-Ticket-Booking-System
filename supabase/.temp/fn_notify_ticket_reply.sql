CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
BEGIN
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF v_ticket IS NULL THEN
    RETURN NEW;
  END IF;

  -- Notify the ticket owner when the reply came from staff/admin
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

  -- Notify the assigned staff when the reply came from the customer
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
$fn$;

