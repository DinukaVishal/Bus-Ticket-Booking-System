import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExpiryBadge } from './ExpiryBadge';
import { formatDate } from '@/lib/compliance/constants';
import type { ComplianceDocumentRow } from '@/types/compliance';
import { Eye, ShieldCheck, FileSearch, Loader2 } from 'lucide-react';

interface ComplianceTableProps {
  documents: ComplianceDocumentRow[];
  isLoading?: boolean;
  onView?: (doc: ComplianceDocumentRow) => void;
  onVerify?: (doc: ComplianceDocumentRow) => void;
  canVerify?: boolean;
  showOwner?: boolean;
}

/**
 * Tabular view of compliance documents with optional view/verify actions.
 */
export function ComplianceTable({
  documents,
  isLoading = false,
  onView,
  onVerify,
  canVerify = false,
  showOwner = false,
}: ComplianceTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileSearch className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 font-medium text-foreground">No compliance documents found</p>
        <p className="mt-1 text-sm text-muted-foreground">Adjust filters or upload new documents.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/60">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Number</TableHead>
            <TableHead>Entity</TableHead>
            {showOwner && <TableHead>Owner</TableHead>}
            <TableHead>Expiry</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verified</TableHead>
            {(onView || onVerify) && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const entityLabel =
              doc.entity_type === 'vehicle'
                ? doc.vehicle?.bus_number
                : doc.entity_type === 'driver'
                  ? doc.driver?.full_name
                  : doc.crew?.full_name;

            return (
              <TableRow key={doc.id} className="transition-colors hover:bg-muted/40">
                <TableCell>
                  <div className="font-medium text-foreground">{doc.document_type?.name || '—'}</div>
                  <div className="text-xs capitalize text-muted-foreground">{doc.entity_type}</div>
                </TableCell>
                <TableCell className="font-mono text-sm">{doc.document_number}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{entityLabel || '—'}</TableCell>
                {showOwner && (
                  <TableCell className="text-sm text-muted-foreground">
                    {doc.owner?.display_name || doc.owner_id.slice(0, 8)}
                  </TableCell>
                )}
                <TableCell className="text-sm">{formatDate(doc.expiry_date)}</TableCell>
                <TableCell>
                  <ExpiryBadge status={doc.status} expiryDate={doc.expiry_date} />
                </TableCell>
                <TableCell>
                  {doc.verified ? (
                    <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )}
                </TableCell>
                {(onView || onVerify) && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {onView && (
                        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onView(doc)}>
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      )}
                      {canVerify && onVerify && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-primary" onClick={() => onVerify(doc)}>
                          <ShieldCheck className="h-3.5 w-3.5" /> Verify
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
