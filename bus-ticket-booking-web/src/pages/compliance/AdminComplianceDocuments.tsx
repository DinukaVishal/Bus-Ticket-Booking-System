import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import {
  ComplianceLayout,
  ComplianceTable,
  ComplianceFilters,
  VerificationDialog,
  DocumentHistoryDialog,
} from '@/components/compliance';
import {
  useComplianceDocuments,
  useDocumentTypes,
  useOwnerList,
} from '@/hooks/useCompliance';
import { exportDocumentsToCsv } from '@/lib/compliance/csvExport';
import { exportDocumentsToPdf } from '@/lib/compliance/pdfExport';
import type { ComplianceDocumentRow, ComplianceFilters as ComplianceFiltersType } from '@/types/compliance';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/**
 * Admin compliance documents page (/admin/compliance/documents).
 * Full document table with search, filters, CSV/PDF export, verification
 * and history viewing.
 */
const AdminComplianceDocuments = () => {
  const [filters, setFilters] = useState<ComplianceFiltersType>({});
  const { data: documents = [], isLoading, error } = useComplianceDocuments(filters);
  const { data: documentTypes = [] } = useDocumentTypes();
  const { data: owners = [] } = useOwnerList();

  const [verifyDoc, setVerifyDoc] = useState<ComplianceDocumentRow | null>(null);
  const [historyDoc, setHistoryDoc] = useState<ComplianceDocumentRow | null>(null);

  const handleCsv = () => {
    if (documents.length === 0) return;
    exportDocumentsToCsv(documents, `compliance-documents-${new Date().toISOString().slice(0, 10)}.csv`);
    toast({ title: 'Export started', description: `${documents.length} document(s) exported to CSV.` });
  };

  const handlePdf = () => {
    if (documents.length === 0) return;
    exportDocumentsToPdf(documents, 'Compliance Documents Report');
    toast({ title: 'Export started', description: 'PDF report generated.' });
  };

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ComplianceLayout
          title="Compliance Documents"
          description="Search, filter, verify and export all compliance documents."
        >
          <div className="space-y-4">
            <ComplianceFilters
              value={filters}
              onChange={setFilters}
              owners={owners}
              documentTypes={documentTypes}
              showOwnerFilter
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={handleCsv} disabled={documents.length === 0}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={handlePdf} disabled={documents.length === 0}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
                Failed to load compliance documents. Please refresh.
              </div>
            ) : (
              <ComplianceTable
                documents={documents}
                showOwner
                canVerify
                onVerify={setVerifyDoc}
                onView={setHistoryDoc}
              />
            )}
          </div>
        </ComplianceLayout>
      </main>

      <VerificationDialog document={verifyDoc} open={!!verifyDoc} onOpenChange={(o) => !o && setVerifyDoc(null)} />
      <DocumentHistoryDialog documentId={historyDoc?.id || null} open={!!historyDoc} onOpenChange={(o) => !o && setHistoryDoc(null)} />
    </div>
  );
};

export default AdminComplianceDocuments;
