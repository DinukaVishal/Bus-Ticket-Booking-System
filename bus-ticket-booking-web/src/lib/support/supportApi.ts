import { supabase } from '@/integrations/supabase/client';
import type {
  CreateTicketInput,
  SupportCategory,
  SupportMessage,
  SupportMessageRow,
  SupportTicket,
  SupportTicketRow,
  TicketFilters,
  TicketNote,
  TicketNoteRow,
  TicketRating,
  SupportAnalytics,
  Notification,
} from '@/types/support';
import { MAX_ATTACHMENT_SIZE, ALLOWED_ATTACHMENT_TYPES } from './constants';

/**
 * API layer for the Customer Support & Helpdesk module.
 * All functions use the authenticated Supabase client; RLS enforces
 * ownership / assignment / admin scoping at the database level.
 */

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export async function fetchCategories(): Promise<SupportCategory[]> {
  const { data, error } = await supabase
    .from('support_categories')
    .select('*')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchAllCategories(): Promise<SupportCategory[]> {
  const { data, error } = await supabase
    .from('support_categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function createCategory(input: { name: string; description?: string }): Promise<SupportCategory> {
  const { data, error } = await supabase
    .from('support_categories')
    .insert({ name: input.name, description: input.description || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: string,
  input: { name?: string; description?: string; active?: boolean }
): Promise<SupportCategory> {
  const { data, error } = await supabase
    .from('support_categories')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('support_categories').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------

export async function createTicket(input: CreateTicketInput): Promise<SupportTicket> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to create a support ticket.');

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: user.id,
      category: input.category,
      subject: input.subject,
      description: input.description,
      priority: input.priority,
      booking_id: input.bookingId || null,
      source: 'user',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMyTickets(): Promise<SupportTicketRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('support_tickets')
    .select<string, SupportTicketRow>(
      `*,
      profiles:user_id (display_name, email),
      assigned_staff:assigned_staff_id (display_name, email)`
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchAssignedTickets(): Promise<SupportTicketRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('support_tickets')
    .select<string, SupportTicketRow>(
      `*,
      profiles:user_id (display_name, email),
      assigned_staff:assigned_staff_id (display_name, email)`
    )
    .eq('assigned_staff_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchAllTickets(filters?: TicketFilters): Promise<SupportTicketRow[]> {
  let query = supabase
    .from('support_tickets')
    .select<string, SupportTicketRow>(
      `*,
      profiles:user_id (display_name, email),
      assigned_staff:assigned_staff_id (display_name, email)`
    );

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters?.assignedStaffId && filters.assignedStaffId !== 'all') {
    query = query.eq('assigned_staff_id', filters.assignedStaffId);
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
  }
  if (filters?.search) {
    const term = filters.search.trim();
    if (term) {
      query = query.or(`ticket_number.ilike.%${term}%,subject.ilike.%${term}%`);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchTicketById(ticketId: string): Promise<SupportTicketRow | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select<string, SupportTicketRow>(
      `*,
      profiles:user_id (display_name, email),
      assigned_staff:assigned_staff_id (display_name, email)`
    )
    .eq('id', ticketId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateTicketStatus(ticketId: string, status: SupportTicket['status']): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status })
    .eq('id', ticketId);
  if (error) throw error;
}

export async function updateTicketPriority(ticketId: string, priority: SupportTicket['priority']): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ priority })
    .eq('id', ticketId);
  if (error) throw error;
}

export async function assignTicket(ticketId: string, staffUserId: string | null): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ assigned_staff_id: staffUserId })
    .eq('id', ticketId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Related booking lookup (used for /support/create?bookingId= pre-fill)
// ---------------------------------------------------------------------

export async function fetchBookingById(bookingId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Messages & attachments
// ---------------------------------------------------------------------

export async function fetchMessages(ticketId: string): Promise<SupportMessageRow[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select<string, SupportMessageRow>(
      `*,
      sender:sender_id (display_name, email)`
    )
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Upload a file attachment to the ticket-attachments storage bucket.
 * Path layout: {ticketId}/{userId}/{timestamp}-{filename}
 */
export async function uploadAttachment(ticketId: string, file: File): Promise<string> {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error('Only image (jpeg, png, gif, webp) and PDF files are allowed.');
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error('Attachment must be 5 MB or smaller.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to upload attachments.');

  const path = `${ticketId}/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error: uploadError } = await supabase.storage
    .from('ticket-attachments')
    .upload(path, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('ticket-attachments')
    .getPublicUrl(path);

  return publicUrl;
}

export async function sendMessage(input: {
  ticketId: string;
  message: string;
  attachment?: File | null;
}): Promise<SupportMessage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to reply.');

  let attachmentUrl: string | null = null;
  if (input.attachment) {
    attachmentUrl = await uploadAttachment(input.ticketId, input.attachment);
  }

  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: input.ticketId,
      sender_id: user.id,
      message: input.message,
      attachment_url: attachmentUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Internal notes (staff/admin only)
// ---------------------------------------------------------------------

export async function fetchNotes(ticketId: string): Promise<TicketNoteRow[]> {
  const { data, error } = await supabase
    .from('support_ticket_notes')
    .select<string, TicketNoteRow>(
      `*,
      author:author_id (display_name, email)`
    )
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addNote(ticketId: string, note: string): Promise<TicketNote> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to add a note.');

  const { data, error } = await supabase
    .from('support_ticket_notes')
    .insert({ ticket_id: ticketId, author_id: user.id, note })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Timeline events
// ---------------------------------------------------------------------

export async function fetchTicketEvents(ticketId: string) {
  const { data, error } = await supabase
    .from('support_ticket_events')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------

export async function rateTicket(input: { ticketId: string; rating: number; feedback?: string }): Promise<TicketRating> {
  const { data, error } = await supabase
    .from('ticket_ratings')
    .insert({
      ticket_id: input.ticketId,
      rating: input.rating,
      feedback: input.feedback || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchTicketRating(ticketId: string): Promise<TicketRating | null> {
  const { data, error } = await supabase
    .from('ticket_ratings')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------

export async function fetchSupportAnalytics(): Promise<SupportAnalytics | null> {
  const { data, error } = await supabase.rpc('get_support_analytics');
  if (error) throw error;
  return (data ?? null) as SupportAnalytics | null;
}

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------

export async function fetchNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);
  if (error) throw error;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw error;
  return count || 0;
}

// ---------------------------------------------------------------------
// Staff list (for admin assignment dropdowns)
// ---------------------------------------------------------------------

export async function fetchStaffUsers(): Promise<{ id: string; display_name: string | null; email?: string | null }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, display_name')
    .order('display_name');

  if (error) throw error;

  // Filter to staff via has_role RPC (profiles don't carry roles in select)
  const staff: { id: string; display_name: string | null; email?: string | null }[] = [];
  const ids = (data || []).map((p) => p.user_id);

  // Fallback: fetch all profiles; assignable users are those with 'staff' role.
  // We can't query roles directly for all users via RLS, so use a SECURITY
  // DEFINER helper below if available, otherwise return all profiles.
  const { data: roleData, error: roleError } = await supabase.rpc('get_staff_users');
  if (!roleError && Array.isArray(roleData)) {
    return roleData as { id: string; display_name: string | null; email?: string | null }[];
  }

  // Fallback - show all profiles (admin UI can still assign, RLS will enforce)
  void ids;
  return (data || []).map((p) => ({ id: p.user_id, display_name: p.display_name }));
}

