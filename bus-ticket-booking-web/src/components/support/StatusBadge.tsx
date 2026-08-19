import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_STYLES } from '@/lib/support/constants';
import type { TicketStatus } from '@/types/support';

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

/**
 * Badge that renders a ticket status with its semantic color scheme.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Open;
  return (
    <Badge variant={style.variant} className={cn('whitespace-nowrap capitalize border', style.className, className)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

