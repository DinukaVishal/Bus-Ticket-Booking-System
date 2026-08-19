GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_categories    TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets              TO authenticated;
GRANT SELECT, INSERT ON public.support_messages                     TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_notes                 TO authenticated;
GRANT SELECT ON public.support_ticket_events                        TO authenticated;
GRANT SELECT, INSERT ON public.ticket_ratings                       TO authenticated;
GRANT SELECT, UPDATE ON public.notifications                        TO authenticated;
GRANT SELECT, UPDATE ON public.support_settings                     TO authenticated;
GRANT USAGE ON SEQUENCE public.support_ticket_number_seq            TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_staff(UUID)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_ticket(UUID, UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_analytics()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_users()                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_support_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

