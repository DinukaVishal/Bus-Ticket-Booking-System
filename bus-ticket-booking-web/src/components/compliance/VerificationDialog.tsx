import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ExpiryBadge } from './ExpiryBadge';
import { useVerifyDocument } from '@/hooks/useCompliance';
import { formatDate } from '@/lib/compliance/constants';
import type { ComplianceDocumentRow } from '@/types/compliance';
import { CheckCircle2, XCircle, RotateCcw, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VerificationDialogProps {
  document: ComplianceDocumentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Admin verification dialog: approve, reject or request resubmission for a
 * compliance document, with optional verification notes.
 */
export function VerificationDialog({ document, open, onOpenChange }: VerificationDialogProps) {
  const verifyMutation = useVerifyDocument();
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'approved' | 'rejected' | 'resubmission'>('approved');

  if (!document) return null;

  const handleVerify = async () => {
    try {
      await verifyMutation.mutateAsync({ documentId: document.id, action, notes });
      toast({ title: 'Verification recorded', description: `Document marked as ${action}.` });
      setNotes('');
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.message || 'Failed to verify document.', variant: 'destructive' });
    }
  };

  const entityLabel =
    document.entity_type === 'vehicle'
      ? document.vehicle?.bus_number
      : document.entity_type === 'driver'
        ? document.driver?.full_name
        : document.crew?.full_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Verify Document
          </DialogTitle>
          <DialogDescription>
            Record the verification decision and add notes for the owner.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{document.document_type?.name}</p>
              <ExpiryBadge status={document.status} expiryDate={document.expiry_date} />
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{document.document_number}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Entity: <strong className="text-foreground capitalize">{document.entity_type}</strong>{entityLabel ? ` · ${entityLabel}` : ''}</span>
              <span>Expiry: <strong className="text-foreground">{formatDate(document.expiry_date)}</strong></span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Decision</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={action === 'approved' ? 'default' : 'outline'}
                className="gap-1.5"
                onClick={() => setAction('approved')}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
              <Button
                type="button"
                variant={action === 'rejected' ? 'destructive' : 'outline'}
                className="gap-1.5"
                onClick={() => setAction('rejected')}
              >
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button
                type="button"
                variant={action === 'resubmission' ? 'secondary' : 'outline'}
                className="gap-1.5"
                onClick={() => setAction('resubmission')}
              >
                <RotateCcw className="h-4 w-4" /> Resubmit
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Verification Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this document..."
              rows={3}
            />
          </div>

          {action === 'approved' && (
            <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
              Approving will mark this document as <Badge variant="outline">verified</Badge> and set its status based on the expiry date.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleVerify}
            disabled={verifyMutation.isPending}
            variant={action === 'rejected' ? 'destructive' : 'default'}
          >
            {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
