import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentVersions, useDocumentVerifications, useAuditLogs } from '@/hooks/useCompliance';
import { formatDateTime } from '@/lib/compliance/constants';
import { History, ShieldCheck, Activity } from 'lucide-react';

interface DocumentHistoryDialogProps {
  documentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Document history dialog: shows version history, verification records
 * and audit trail for a compliance document.
 */
export function DocumentHistoryDialog({ documentId, open, onOpenChange }: DocumentHistoryDialogProps) {
  const { data: versions = [], isLoading: versionsLoading } = useDocumentVersions(documentId || undefined);
  const { data: verifications = [], isLoading: verificationsLoading } = useDocumentVerifications(documentId || undefined);
  const { data: auditLogs = [], isLoading: auditLoading } = useAuditLogs(documentId || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Document History
          </DialogTitle>
          <DialogDescription>
            Version history, verification records and audit trail for this document.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="versions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="versions" className="gap-1.5">
              <History className="h-3.5 w-3.5" /> Versions
            </TabsTrigger>
            <TabsTrigger value="verifications" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Verifications
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="space-y-2">
            {versionsLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : versions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No version history yet.</p>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="rounded-xl border border-border/60 bg-card/50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">Version {v.version}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(v.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Uploaded by {v.uploader?.display_name || v.uploaded_by?.slice(0, 8) || 'Unknown'}
                  </p>
                  {v.notes && <p className="mt-1 text-xs text-muted-foreground">{v.notes}</p>}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="verifications" className="space-y-2">
            {verificationsLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : verifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No verification records yet.</p>
            ) : (
              verifications.map((v) => (
                <div key={v.id} className="rounded-xl border border-border/60 bg-card/50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={
                        v.action === 'approved'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : v.action === 'rejected'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                      }
                    >
                      {v.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(v.verified_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    By {v.verifier?.display_name || v.verified_by.slice(0, 8)}
                  </p>
                  {v.notes && <p className="mt-1 text-xs text-muted-foreground">{v.notes}</p>}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-2">
            {auditLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : auditLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No audit entries yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-border/60 bg-card/50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{log.action}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
                  </div>
                  {(log as any).actor?.display_name && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      By {(log as any).actor.display_name}
                    </p>
                  )}
                  {log.old_values && log.new_values && (
                    <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                      changed {Object.keys(log.new_values).length} field(s)
                    </p>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
