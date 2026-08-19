import type { TicketPriority, TicketStatus } from '@/types/support';

/**
 * Shared constants, label maps and styling helpers for the Support module.
 */

export const TICKET_STATUSES: TicketStatus[] = [
  'Open',
  'In Progress',
  'Waiting for Customer',
  'Resolved',
  'Closed',
  'Escalated',
];

export const TICKET_PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];

export const DEFAULT_CATEGORIES = [
  'Booking Issue',
  'Payment Problem',
  'Refund Request',
  'Bus Delay',
  'Seat Issue',
  'Technical Problem',
  'Account Issue',
  'Complaint',
  'Suggestion',
  'Other',
];

/** Maps a TicketStatus to a shadcn Badge variant + Tailwind classes. */
export const STATUS_STYLES: Record<
  TicketStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
> = {
  Open: { variant: 'secondary', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  'In Progress': { variant: 'default', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Waiting for Customer': { variant: 'outline', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  Resolved: { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Closed: { variant: 'secondary', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  Escalated: { variant: 'destructive', className: 'bg-red-50 text-red-700 border-red-200' },
};

/** Maps a TicketPriority to badge classes + dot color. */
export const PRIORITY_STYLES: Record<
  TicketPriority,
  { badge: string; dot: string }
> = {
  Low: { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  Medium: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  High: { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  Critical: { badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-600 animate-pulse' },
};

export const CATEGORY_EMOJI: Record<string, string> = {
  'Booking Issue': '🎫',
  'Payment Problem': '💳',
  'Refund Request': '💸',
  'Bus Delay': '⏰',
  'Seat Issue': '💺',
  'Technical Problem': '🛠️',
  'Account Issue': '👤',
  Complaint: '📢',
  Suggestion: '💡',
  Other: '📋',
};

export const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5 MB

export const TICKET_STATUS_ORDER: TicketStatus[] = [
  'Open',
  'In Progress',
  'Waiting for Customer',
  'Escalated',
  'Resolved',
  'Closed',
];

/** Human readable duration for analytics display. */
export function formatDurationHours(hours: number): string {
  if (!hours) return '—';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

export function formatDate(date?: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(date?: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

