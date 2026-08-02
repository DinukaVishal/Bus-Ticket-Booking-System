import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/support/constants';
import type { TicketEvent } from '@/types/support';

const eventIcons: Record<string, string> = {
  created: '🆕',
  status_changed: '🔄',
  priority_changed: '🚨',
  assigned: '👤',
  reply: '💬',
};

interface TicketTimelineProps {
  events: TicketEvent[];
  className?: string;
}

/**
 * Vertical timeline showing the lifecycle events of a ticket.
 */
export function TicketTimeline({ events, className }: TicketTimelineProps) {
  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className={cn('relative space-y-5 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border', className)}>
      {events.map((event) => (
        <li key={event.id} className="relative flex gap-4 pl-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-sm shadow-sm">
            {eventIcons[event.event_type] || '•'}
          </div>
          <div className="flex-1 pb-1">
            <p className="text-sm font-medium text-foreground">
              {event.description || event.event_type.replace(/_/g, ' ')}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(event.created_at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

