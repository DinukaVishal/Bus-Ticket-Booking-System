import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import {
  ComplianceLayout,
  ComplianceDashboard,
  ComplianceCard,
  ComplianceScoreCard,
  VerificationDialog,
  DocumentHistoryDialog,
} from '@/components/compliance';
import { useComplianceDashboard, useComplianceDocuments, useComplianceScore, useOwnerList } from '@/hooks/useCompliance';
import type { ComplianceDocumentRow } from '@/types/compliance';
import { Link } from 'react-router-dom';
import { FileText, PlusCircle, Upload } from 'lucide-react';

/**
 * Admin Compliance dashboard (/admin/compliance).
 * Shows overall stats, charts, owner compliance rates and recent documents.
 */
const AdminCompliance = () => {
  const navigate = useNavigate();
  const [ownerFilter, setOwnerFilter] = useState<string | undefined>(undefined);
  const { data: dashboard, isLoading } = useComplianceDashboard(ownerFilter);
  const { data: documents = [], isLoading: docsLoading } = useComplianceDocuments({ status: 'pending' }, ownerFilter);
  const { data: score } = useComplianceScore(ownerFilter);
  const { data: owners = [] } = useOwnerList();

  const [verifyDoc, setVerifyDoc] = useState<ComplianceDocumentRow | null>(null);
  const [historyDoc, setHistoryDoc] = useState<ComplianceDocumentRow | null>(null);

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ComplianceLayout
          title="Compliance & Regulatory Management"
          description="Admin: monitor all legal documents, verification and compliance across owners."
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Owner:</label>
                <select
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                  value={ownerFilter || 'all'}
                  onChange={(e) => setOwnerFilter(e.target.value === 'all' ? undefined : e.target.value)}
                >
                  <option value="all">All Owners</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.display_name || o.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/admin/compliance/documents">
                    <FileText className="h-4 w-4" /> Documents
                  </Link>
                </Button>
                <Button asChild className="gap-2">
                  <Link to="/admin/compliance/reports">
                    <PlusCircle className="h-4 w-4" /> Reports
                  </Link>
                </Button>
              </div>
            </div>

            <ComplianceDashboard data={dashboard} isLoading={isLoading} />

            {score && (
              <ComplianceScoreCard
                score={Number(score.score)}
                validCount={score.valid_count}
                requiredCount={score.required_count}
              />
            )}

            <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Pending Verification</h3>
                  <p className="text-sm text-muted-foreground">Documents awaiting admin review.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/compliance/documents')}>
                  View all
                </Button>
              </div>

              {docsLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading pending documents...</p>
              ) : documents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No pending documents.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {documents.slice(0, 6).map((doc) => (
                    <ComplianceCard
                      key={doc.id}
                      document={doc}
                      canVerify
                      onVerify={setVerifyDoc}
                      onView={setHistoryDoc}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </ComplianceLayout>
      </main>

      <VerificationDialog document={verifyDoc} open={!!verifyDoc} onOpenChange={(o) => !o && setVerifyDoc(null)} />
      <DocumentHistoryDialog documentId={historyDoc?.id || null} open={!!historyDoc} onOpenChange={(o) => !o && setHistoryDoc(null)} />
    </div>
  );
};

export default AdminCompliance;
