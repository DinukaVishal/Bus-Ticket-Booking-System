import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComplianceLayout } from '@/components/compliance';
import { useDocumentTypes } from '@/hooks/useCompliance';
import { CATEGORY_LABELS } from '@/lib/compliance/constants';
import { Loader2, FileText, ShieldCheck } from 'lucide-react';

/**
 * Admin compliance settings page (/admin/compliance/settings).
 * Shows the configured document types and required categories.
 */
const AdminComplianceSettings = () => {
  const { data: documentTypes = [], isLoading } = useDocumentTypes();

  const vehicleDocs = documentTypes.filter((d) => d.category === 'vehicle');
  const driverDocs = documentTypes.filter((d) => d.category === 'driver');
  const crewDocs = documentTypes.filter((d) => d.category === 'crew');

  if (isLoading) {
    return (
      <div className="min-h-screen page-shell page-bg">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <ComplianceLayout>
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </ComplianceLayout>
        </main>
      </div>
    );
  }

  const sections = [
    { title: 'Vehicle Documents', docs: vehicleDocs, icon: '🚌' },
    { title: 'Driver Documents', docs: driverDocs, icon: '🧑‍✈️' },
    { title: 'Crew Documents', docs: crewDocs, icon: '🧑‍🔧' },
  ];

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ComplianceLayout
          title="Compliance Settings"
          description="Configure which document types are tracked for each entity."
        >
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">Document Type Registry</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                These are the regulatory document types tracked for vehicles, drivers and crew. Document types are
                seeded by the database migration and can be extended by an administrator.
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              {sections.map((section) => (
                <Card key={section.title}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <span>{section.icon}</span> {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {section.docs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/40 p-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium text-foreground">{doc.name}</span>
                        </div>
                        {doc.required ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 shrink-0">Required</Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0">Optional</Badge>
                        )}
                      </div>
                    ))}
                    {section.docs.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">No documents configured.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Category Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((cat) => {
                  const count = documentTypes.filter((d) => d.category === cat).length;
                  return (
                    <div key={cat} className="rounded-xl border border-border/60 bg-card/40 p-4 text-center">
                      <p className="font-display text-2xl font-bold text-primary">{count}</p>
                      <p className="text-sm capitalize text-muted-foreground">{CATEGORY_LABELS[cat]}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </ComplianceLayout>
      </main>
    </div>
  );
};

export default AdminComplianceSettings;
