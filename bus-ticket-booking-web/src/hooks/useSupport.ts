import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  CreateTicketInput,
  Notification,
  SupportAnalytics,
  SupportCategory,
  SupportMessage,
  SupportMessageRow,
  SupportTicket,
  SupportTicketRow,
  TicketFilters,
  TicketNote,
  TicketNoteRow,
  TicketRating,
  TicketEvent,
} from '@/types/support';
import {
  fetchCategories,
  fetchMyTickets,
  fetchAssignedTickets,
  fetchAllTickets,
  fetchTicketById,
  fetchMessages,
  fetchNotes,
  fetchTicketEvents,
  fetchTicketRating,
  fetchSupportAnalytics,
  fetchNotifications,
  fetchUnreadCount,
  fetchStaffUsers,
  createTicket,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  sendMessage,
  addNote,
  rateTicket,
  createCategory,
  updateCategory,
  deleteCategory,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/support/supportApi';

// ---------------------------------------------------------------------
// Realtime subscription helper
// ---------------------------------------------------------------------

function useRealtimeInvalidate(table: string, queryKeys: string[][]) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`support-${table}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, table, JSON.stringify(queryKeys)]);
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: ['support-categories'],
    queryFn: fetchCategories,
  });
}

export function useAllCategories() {
  return useQuery({
    queryKey: ['support-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as SupportCategory[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-categories'] });
      queryClient.invalidateQueries({ queryKey: ['support-categories-all'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; description?: string; active?: boolean } }) =>
      updateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-categories'] });
      queryClient.invalidateQueries({ queryKey: ['support-categories-all'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-categories'] });
      queryClient.invalidateQueries({ queryKey: ['support-categories-all'] });
    },
  });
}

// ---------------------------------------------------------------------
// Tickets (lists)
// ---------------------------------------------------------------------

export function useMyTickets() {
  const { user, isLoading: authLoading } = useAuth();
  useRealtimeInvalidate('support_tickets', [['support-my-tickets', user?.id]]);

  return useQuery({
    queryKey: ['support-my-tickets', user?.id],
    enabled: !!user && !authLoading,
    queryFn: fetchMyTickets,
  });
}

export function useAssignedTickets() {
  const { user, isLoading: authLoading, isStaff } = useAuth();
  useRealtimeInvalidate('support_tickets', [['support-assigned-tickets', user?.id]]);

  return useQuery({
    queryKey: ['support-assigned-tickets', user?.id],
    enabled: !!user && !authLoading && isStaff,
    queryFn: fetchAssignedTickets,
  });
}

export function useAllTickets(filters?: TicketFilters) {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const key = ['support-all-tickets', JSON.stringify(filters || {})];
  useRealtimeInvalidate('support_tickets', [key]);

  return useQuery({
    queryKey: key,
    enabled: !!user && !authLoading && isAdmin,
    queryFn: () => fetchAllTickets(filters),
  });
}

// ---------------------------------------------------------------------
// Ticket detail + conversation
// ---------------------------------------------------------------------

export function useTicket(ticketId?: string) {
  const { user, isLoading: authLoading } = useAuth();
  useRealtimeInvalidate('support_messages', [['support-ticket', ticketId]]);

  return useQuery({
    queryKey: ['support-ticket', ticketId],
    enabled: !!ticketId && !!user && !authLoading,
    queryFn: () => fetchTicketById(ticketId as string),
  });
}

export function useTicketMessages(ticketId?: string) {
  const { user, isLoading: authLoading } = useAuth();
  useRealtimeInvalidate('support_messages', [['support-messages', ticketId]]);

  return useQuery({
    queryKey: ['support-messages', ticketId],
    enabled: !!ticketId && !!user && !authLoading,
    queryFn: () => fetchMessages(ticketId as string),
  });
}

export function useTicketNotes(ticketId?: string) {
  const { user, isLoading: authLoading } = useAuth();
  useRealtimeInvalidate('support_ticket_notes', [['support-notes', ticketId]]);

  return useQuery({
    queryKey: ['support-notes', ticketId],
    enabled: !!ticketId && !!user && !authLoading,
    queryFn: () => fetchNotes(ticketId as string),
  });
}

export function useTicketEvents(ticketId?: string) {
  const { user, isLoading: authLoading } = useAuth();
  useRealtimeInvalidate('support_ticket_events', [['support-events', ticketId]]);

  return useQuery({
    queryKey: ['support-events', ticketId],
    enabled: !!ticketId && !!user && !authLoading,
    queryFn: () => fetchTicketEvents(ticketId as string),
  });
}

export function useTicketRating(ticketId?: string) {
  const { user, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ['support-rating', ticketId],
    enabled: !!ticketId && !!user && !authLoading,
    queryFn: () => fetchTicketRating(ticketId as string),
  });
}

// ---------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-my-tickets'] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: SupportTicket['status'] }) =>
      updateTicketStatus(ticketId, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', vars.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-my-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-assigned-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-all-tickets'] });
    },
  });
}

export function useUpdateTicketPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, priority }: { ticketId: string; priority: SupportTicket['priority'] }) =>
      updateTicketPriority(ticketId, priority),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', vars.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-all-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-assigned-tickets'] });
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, staffUserId }: { ticketId: string; staffUserId: string | null }) =>
      assignTicket(ticketId, staffUserId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', vars.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-all-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-assigned-tickets'] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ticketId: string; message: string; attachment?: File | null }) =>
      sendMessage(input),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['support-messages', vars.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', vars.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-events', vars.ticketId] });
    },
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, note }: { ticketId: string; note: string }) => addNote(ticketId, note),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['support-notes', vars.ticketId] });
    },
  });
}

export function useRateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ticketId: string; rating: number; feedback?: string }) => rateTicket(input),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['support-rating', vars.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', vars.ticketId] });
    },
  });
}

// ---------------------------------------------------------------------
// Staff users (admin assignment dropdown)
// ---------------------------------------------------------------------

export function useStaffUsers() {
  return useQuery({
    queryKey: ['support-staff-users'],
    queryFn: fetchStaffUsers,
  });
}

// ---------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------

export function useSupportAnalytics() {
  const { user, isAdmin, isStaff, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ['support-analytics', user?.id],
    enabled: !!user && !authLoading && (isAdmin || isStaff),
    queryFn: fetchSupportAnalytics,
  });
}

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------

export function useNotifications() {
  const { user, isLoading: authLoading } = useAuth();
  useRealtimeInvalidate('notifications', [['notifications', user?.id], ['notifications-unread', user?.id]]);

  return useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user && !authLoading,
    queryFn: fetchNotifications,
  });
}

export function useUnreadCount() {
  const { user, isLoading: authLoading } = useAuth();
  useRealtimeInvalidate('notifications', [['notifications-unread', user?.id]]);

  return useQuery({
    queryKey: ['notifications-unread', user?.id],
    enabled: !!user && !authLoading,
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

// Re-export types used by pages for convenience
export type {
  SupportTicket,
  SupportTicketRow,
  SupportMessage,
  SupportMessageRow,
  TicketNote,
  TicketNoteRow,
  TicketRating,
  TicketEvent,
  Notification,
  SupportAnalytics,
};

