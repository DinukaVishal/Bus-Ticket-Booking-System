import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_STYLES, daysUntil } from '@/lib/compliance/constants';
import type { ComplianceStatus } from '@/types/compliance';

interface ExpiryBadgeProps {
  status: ComplianceStatus;
  expiryDate?: string | null;
  className?: string;
}

/**
 * Renders a colored badge for a compliance document status, with an
 * optional "days remaining" subtitle when an expiry date is provided.
 */
export function ExpiryBadge({ status, expiryDate, className }: ExpiryBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const days = daysUntil(expiryDate);

  return (
    <div className={cn('inline-flex flex-col items-start gap-0.5', className)}>
      <Badge variant="outline" className={cn('gap-1.5 border', style.badge)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
        {style.label}
      </Badge>
      {days !== null && (status === 'valid' || status === 'expiring_soon') && (
        <span
          className={cn(
            'text-[10px] font-medium',
            days < 0 ? 'text-red-600' : days <= 30 ? 'text-orange-600' : 'text-muted-foreground'
          )}
        >
          {days < 0
            ? `${Math.abs(days)}d overdue`
            : days === 0
              ? 'Expires today'
              : `${days} day${days === 1 ? '' : 's'} left`}
        </span>
      )}
    </div>
  );
}
