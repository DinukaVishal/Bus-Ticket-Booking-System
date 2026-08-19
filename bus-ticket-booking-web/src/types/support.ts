/**
 * Customer Support & Helpdesk module types.
 * Mirrors the schema defined in supabase/migrations/20260521_add_support_system.sql
 */

export type TicketStatus =
  | 'Open'
  | 'In Progress'
  | 'Waiting for Customer'
  | 'Resolved'
  | 'Closed'
  | 'Escalated';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface SupportCategory {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  assigned_staff_id: string | null;
  category: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  booking_id: string | null;
  source: 'user' | 'system';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

/** SupportTicket joined with customer/staff profile names for list views */
export interface SupportTicketRow extends SupportTicket {
  profiles?: {
    display_name: string | null;
    email?: string | null;
  } | null;
  assigned_staff?: {
    display_name: string | null;
    email?: string | null;
  } | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

export interface SupportMessageRow extends SupportMessage {
  sender?: {
    display_name: string | null;
    email?: string | null;
  } | null;
}

export interface TicketNote {
  id: string;
  ticket_id: string;
  author_id: string;
  note: string;
  created_at: string;
}

export interface TicketNoteRow extends TicketNote {
  author?: {
    display_name: string | null;
    email?: string | null;
  } | null;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  event_type: string;
  description: string | null;
  created_at: string;
}

export interface TicketRating {
  id: string;
  ticket_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface TicketStats {
  total_tickets: number;
  open_tickets: number;
  resolved_today: number;
  avg_resolution_hours: number;
  critical_tickets: number;
  by_category?: { name: string; count: number }[];
  by_status: { name: string; count: number }[];
  by_priority?: { name: string; count: number }[];
  monthly_tickets?: { month: string; count: number }[];
  staff_performance?: {
    staff_id: string;
    total: number;
    resolved: number;
  }[];
}

export type SupportAnalytics = TicketStats;

export interface CreateTicketInput {
  category: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  bookingId?: string | null;
}

export interface TicketFilters {
  search?: string;
  status?: TicketStatus | 'all';
  priority?: TicketPriority | 'all';
  category?: string | 'all';
  assignedStaffId?: string | 'all';
  dateFrom?: string;
  dateTo?: string;
}

