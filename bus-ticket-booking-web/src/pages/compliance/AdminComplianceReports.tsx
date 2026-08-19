import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComplianceLayout } from '@/components/compliance';
import { useComplianceReport, useOwnerList } from '@/hooks/useCompliance';
import { exportReportToCsv } from '@/lib/compliance/csvExport';
import { exportComplianceReportToPdf } from '@/lib/compliance/pdfExport';
import { formatDate } from '@/lib/compliance/constants';
import { Download, FileText, Loader2, AlertTriangle, CalendarClock, FileQuestion } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/**
 * Admin compliance reports page (/admin/compliance/reports).
 * Shows expired, upcoming renewals and missing documents with CSV/PDF export.
 */
const AdminComplianceReports = () => {
  const [ownerFilter, setOwnerFilter] = useState<string | undefined>(undefined);
  const { data: report, isLoading, error } = useComplianceReport(ownerFilter);
  const { data: owners = [] } = useOwnerList();

  const handleCsv = (section: 'expired' | 'upcoming') => {
    if (!report) return;
    exportReportToCsv(report, section, `compliance-${section}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast({ title: 'Export started', description: `${section} report exported to CSV.` });
  };

  const handlePdf = () => {
    if (!report) return;
    exportComplianceReportToPdf(report, 'Compliance Report');
    toast({ title: 'Export started', description: 'PDF report generated.' });
  };

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ComplianceLayout
          title="Compliance Reports"
          description="Expired documents, upcoming renewals and missing documents."
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
              <Button variant="outline" className="gap-2" onClick={handlePdf} disabled={!report || isLoading}>
                <FileText className="h-4 w-4" /> Export PDF
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error || !report ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
                Failed to load compliance report.
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Expired */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <AlertTriangle className="h-4 w-4 text-red-500" /> Expired Documents
                    </CardTitle>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleCsv('expired')} disabled={(report.expired || []).length === 0}>
                      <Download className="h-3.5 w-3.5" /> CSV
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!report.expired || report.expired.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No expired documents.</p>
                    ) : (
                      report.expired.map((r, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/40 p-2.5 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{r.document_type}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">{r.document_number}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Expired</Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(r.expiry_date)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <CalendarClock className="h-4 w-4 text-orange-500" /> Upcoming Renewals (90 days)
                    </CardTitle>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleCsv('upcoming')} disabled={(report.upcoming || []).length === 0}>
                      <Download className="h-3.5 w-3.5" /> CSV
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!report.upcoming || report.upcoming.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No upcoming renewals.</p>
                    ) : (
                      report.upcoming.map((r, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/40 p-2.5 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{r.document_type}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">{r.document_number}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                              {r.days_remaining}d left
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(r.expiry_date)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Missing */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <FileQuestion className="h-4 w-4 text-amber-500" /> Missing Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!report.missing || report.missing.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No missing documents.</p>
                    ) : (
                      report.missing.map((m, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/40 p-2.5 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{m.document_name}</p>
                            <p className="truncate text-xs capitalize text-muted-foreground">{m.entity_type}</p>
                          </div>
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Missing</Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ComplianceLayout>
      </main>
    </div>
  );
};

export default AdminComplianceReports;
