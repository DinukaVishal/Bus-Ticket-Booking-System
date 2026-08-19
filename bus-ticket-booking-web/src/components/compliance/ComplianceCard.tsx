import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExpiryBadge } from './ExpiryBadge';
import { formatDate } from '@/lib/compliance/constants';
import type { ComplianceDocumentRow } from '@/types/compliance';
import { ExternalLink, FileText, Eye, CheckCircle2 } from 'lucide-react';

interface ComplianceCardProps {
  document: ComplianceDocumentRow;
  onView?: (doc: ComplianceDocumentRow) => void;
  onVerify?: (doc: ComplianceDocumentRow) => void;
  canVerify?: boolean;
  className?: string;
}

/**
 * Card view for an individual compliance document (used on dashboards
 * and the owner compliance page).
 */
export function ComplianceCard({ document, onView, onVerify, canVerify = false, className }: ComplianceCardProps) {
  const entityLabel =
    document.entity_type === 'vehicle'
      ? document.vehicle?.bus_number
      : document.entity_type === 'driver'
        ? document.driver?.full_name
        : document.crew?.full_name;

  return (
    <Card className={cn('p-4 hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-0 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {document.document_type?.name || 'Document'}
            </p>
            <p className="truncate font-mono text-xs text-muted-foreground">{document.document_number}</p>
          </div>
          <ExpiryBadge status={document.status} expiryDate={document.expiry_date} />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span className="capitalize">{document.entity_type}</span>
          {entityLabel && <span className="truncate">· {entityLabel}</span>}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Expiry: <strong className="text-foreground">{formatDate(document.expiry_date)}</strong>
          </span>
          {document.verified ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
            </span>
          ) : (
            <span className="text-muted-foreground">Not verified</span>
          )}
        </div>

        {(onView || onVerify) && (
          <div className="flex gap-2 pt-1">
            {onView && (
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => onView(document)}>
                <Eye className="h-3.5 w-3.5" /> View
              </Button>
            )}
            {canVerify && onVerify && (
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-primary" onClick={() => onVerify(document)}>
                <ExternalLink className="h-3.5 w-3.5" /> Verify
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
