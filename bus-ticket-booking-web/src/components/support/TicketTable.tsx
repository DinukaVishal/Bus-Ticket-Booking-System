import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { CATEGORY_EMOJI, formatDateTime } from '@/lib/support/constants';
import type { SupportTicketRow } from '@/types/support';
import { ChevronRight } from 'lucide-react';

interface TicketTableProps {
  tickets: SupportTicketRow[];
  basePath?: string;
  showCustomer?: boolean;
  showAssigned?: boolean;
}

/**
 * Responsive table of support tickets. Rows navigate to the ticket detail page.
 */
export function TicketTable({ tickets, basePath = '/support', showCustomer = false, showAssigned = false }: TicketTableProps) {
  const navigate = useNavigate();

  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 py-16 text-center">
        <p className="text-muted-foreground">No tickets found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/70">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead>Subject</TableHead>
            {showCustomer && <TableHead>Customer</TableHead>}
            <TableHead>Category</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            {showAssigned && <TableHead>Assigned To</TableHead>}
            <TableHead>Created</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="cursor-pointer transition-colors hover:bg-muted/60"
              onClick={() => navigate(`${basePath}/${ticket.id}`)}
            >
              <TableCell className="font-mono text-xs font-semibold text-primary">{ticket.ticket_number}</TableCell>
              <TableCell className="max-w-[240px]">
                <div className="truncate font-medium">{ticket.subject}</div>
              </TableCell>
              {showCustomer && (
                <TableCell className="max-w-[160px]">
                  <div className="truncate text-sm">{ticket.profiles?.display_name || '—'}</div>
                </TableCell>
              )}
              <TableCell>
                <Badge variant="outline" className="gap-1 whitespace-nowrap bg-muted/40">
                  <span>{CATEGORY_EMOJI[ticket.category] || '📋'}</span>
                  {ticket.category}
                </Badge>
              </TableCell>
              <TableCell>
                <PriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell>
                <StatusBadge status={ticket.status} />
              </TableCell>
              {showAssigned && (
                <TableCell className="max-w-[140px]">
                  <div className="truncate text-sm text-muted-foreground">
                    {ticket.assigned_staff?.display_name || 'Unassigned'}
                  </div>
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTime(ticket.created_at)}
              </TableCell>
              <TableCell>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

