import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ComplianceTable,
  ComplianceDashboard,
  ComplianceScoreCard,
  VerificationDialog,
  DocumentHistoryDialog,
} from '@/components/compliance';
import {
  useComplianceDashboard,
  useComplianceDocuments,
  useComplianceScore,
  useExpiringDocuments,
} from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import type { ComplianceDocumentRow } from '@/types/compliance';
import {
  LayoutDashboard,
  ShieldCheck,
  ArrowLeft,
  Upload,
  AlertTriangle,
  Timer,
} from 'lucide-react';

/**
 * Bus Owner compliance dashboard (/owner/compliance).
 * Shows the owner their documents, compliance score, expiring documents.
 */
const OwnerCompliance = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: dashboard, isLoading } = useComplianceDashboard(user?.id);
  const { data: documents = [] } = useComplianceDocuments({}, user?.id);
  const { data: score } = useComplianceScore(user?.id);
  const { data: expiring = [] } = useExpiringDocuments(30, user?.id);

  const [verifyDoc, setVerifyDoc] = useState<ComplianceDocumentRow | null>(null);
  const [historyDoc, setHistoryDoc] = useState<ComplianceDocumentRow | null>(null);

  const pendingVerification = documents.filter((d) => d.status === 'pending');

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl pb-10 relative overflow-hidden">
      <Header />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]">
        <div className="absolute left-6 top-8 w-44 h-44 rounded-full bg-primary/10 blur-3xl animate-blob" />
        <div className="absolute right-6 top-24 w-56 h-56 rounded-full bg-accent/15 blur-3xl animate-blob delay-2000" />
      </div>

      <main className="container mx-auto px-4 py-8 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Compliance Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your buses, drivers and crew compliance documents and renewals.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2" onClick={() => navigate('/owner/compliance/upload')}>
              <Upload className="h-4 w-4" /> Upload Document
            </Button>
            <Button variant="outline" onClick={() => navigate('/bus-owner/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <ComplianceDashboard data={dashboard} isLoading={isLoading} />

          {score && (
            <ComplianceScoreCard
              score={Number(score.score)}
              validCount={score.valid_count}
              requiredCount={score.required_count}
            />
          )}

          {/* Expiring soon */}
          {expiring.length > 0 && (
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Timer className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">{expiring.length} document(s) expiring within 30 days</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {expiring.slice(0, 5).map((e) => (
<span key={e.id} className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs text-orange-700">
                          {e.document_type || 'Document'} — {e.expiry_date?.slice(0, 10)}
                        </span>
                      ))}
                      {expiring.length > 5 && (
                        <span className="text-xs text-muted-foreground">+{expiring.length - 5} more</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending verification */}
          {pendingVerification.length > 0 && (
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {pendingVerification.length} document(s) pending verification
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Documents will be reviewed by an administrator.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">All Documents</h3>
                <p className="text-sm text-muted-foreground">All your compliance documents.</p>
              </div>
            </div>
            <ComplianceTable
              documents={documents}
              onView={setHistoryDoc}
            />
          </div>
        </div>
      </main>

      <VerificationDialog document={verifyDoc} open={!!verifyDoc} onOpenChange={(o) => !o && setVerifyDoc(null)} />
      <DocumentHistoryDialog documentId={historyDoc?.id || null} open={!!historyDoc} onOpenChange={(o) => !o && setHistoryDoc(null)} />
    </div>
  );
};

export default OwnerCompliance;
