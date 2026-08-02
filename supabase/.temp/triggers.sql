DROP TRIGGER IF EXISTS trg_support_ticket_number        ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_status        ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_updated_at    ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_created_event ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_status_event  ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_priority_event ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_ticket_assign_event  ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_notify_created       ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_notify_assigned      ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_notify_status        ON public.support_tickets;
DROP TRIGGER IF EXISTS trg_support_message_event        ON public.support_messages;
DROP TRIGGER IF EXISTS trg_support_message_notify       ON public.support_messages;

CREATE TRIGGER trg_support_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

CREATE TRIGGER trg_support_ticket_status
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_status_change();

CREATE TRIGGER trg_support_ticket_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_support_ticket_created_event
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_created_event();

CREATE TRIGGER trg_support_ticket_status_event
  AFTER UPDATE OF status ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_status_event();

CREATE TRIGGER trg_support_ticket_priority_event
  AFTER UPDATE OF priority ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_priority_event();

CREATE TRIGGER trg_support_ticket_assign_event
  AFTER UPDATE OF assigned_staff_id ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_assignment_event();

CREATE TRIGGER trg_support_notify_created
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_created();

CREATE TRIGGER trg_support_notify_assigned
  AFTER UPDATE OF assigned_staff_id ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_assigned();

CREATE TRIGGER trg_support_notify_status
  AFTER UPDATE OF status ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_status_changed();

CREATE TRIGGER trg_support_message_event
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_reply_event();

CREATE TRIGGER trg_support_message_notify
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_reply();

