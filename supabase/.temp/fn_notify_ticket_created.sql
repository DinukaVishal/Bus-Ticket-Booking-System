CREATE OR REPLACE FUNCTION public.notify_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, link)
  SELECT
    ur.user_id,
    'New Support Ticket',
    'Ticket ' || NEW.ticket_number || ' created: ' || NEW.subject,
    'support',
    'support_ticket',
    NEW.id,
    '/support/' || NEW.id
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::public.app_role;
  RETURN NEW;
END;
$fn$;

