import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PRIORITY_STYLES } from '@/lib/support/constants';
import type { TicketPriority } from '@/types/support';

interface PriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
}

/**
 * Badge that renders a ticket priority with a colored indicator dot.
 */
export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.Medium;
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap gap-1.5 border', style.badge, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {priority}
    </Badge>
  );
}

