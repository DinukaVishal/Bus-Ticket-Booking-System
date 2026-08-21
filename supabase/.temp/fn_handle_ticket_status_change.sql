CREATE OR REPLACE FUNCTION public.handle_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.status = 'Resolved' AND OLD.status IS DISTINCT FROM 'Resolved' THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  ELSIF NEW.status <> 'Resolved' THEN
    NEW.resolved_at := NULL;
  END IF;

  IF NEW.status = 'Closed' AND OLD.status IS DISTINCT FROM 'Closed' THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  ELSIF NEW.status <> 'Closed' THEN
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$fn$;

