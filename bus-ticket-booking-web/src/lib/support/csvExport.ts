import type { SupportTicketRow } from '@/types/support';

/**
 * Exports an array of tickets to a CSV file and triggers a browser download.
 */
export function exportTicketsToCsv(tickets: SupportTicketRow[], filename = 'support-tickets.csv') {
  const headers = [
    'Ticket Number',
    'Subject',
    'Category',
    'Priority',
    'Status',
    'Customer',
    'Assigned Staff',
    'Created At',
    'Updated At',
    'Resolved At',
    'Closed At',
  ];

  const rows = tickets.map((t) => [
    t.ticket_number,
    t.subject,
    t.category,
    t.priority,
    t.status,
    t.profiles?.display_name || t.user_id || '',
    t.assigned_staff?.display_name || '',
    t.created_at,
    t.updated_at,
    t.resolved_at || '',
    t.closed_at || '',
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          // Escape quotes and wrap in quotes if contains comma, quote or newline
          if (/[",\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

