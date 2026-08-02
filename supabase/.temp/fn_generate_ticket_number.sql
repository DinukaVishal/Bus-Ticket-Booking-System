CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  seq_num BIGINT;
BEGIN
  seq_num := nextval('public.support_ticket_number_seq');
  NEW.ticket_number := 'SUP-' || lpad(seq_num::text, 5, '0');
  RETURN NEW;
END;
$fn$;