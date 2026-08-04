import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UploadDocumentDialog } from '@/components/compliance';
import { useAuth } from '@/hooks/useAuth';
import { useDrivers } from '@/hooks/useDrivers';
import { useCrewMembers } from '@/hooks/useCrewMembers';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { UploadCloud, ArrowLeft, Loader2, FileText } from 'lucide-react';

/**
 * Bus Owner compliance upload page (/owner/compliance/upload).
 * Lets the owner pick a vehicle/driver/crew and upload a compliance document.
 */
const OwnerComplianceUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: drivers = [] } = useDrivers();
  const { data: crew = [] } = useCrewMembers();

  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['owner-buses', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('owner_buses')
        .select('id, bus_number')
        .eq('bus_owner_id', user.id);
      if (error) throw error;
      return (data || []) as { id: string; bus_number: string }[];
    },
  });

  const vehicleOptions = vehicles.map((v) => ({ id: v.id, bus_number: v.bus_number }));
  const driverOptions = drivers.map((d) => ({ id: d.id, full_name: d.full_name }));
  const crewOptions = crew.map((c) => ({ id: c.id, full_name: c.full_name }));

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
            <UploadCloud className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Upload Compliance Document</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Upload scanned copies of your legal documents. PDF, JPG or PNG up to 10 MB.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/owner/compliance')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Compliance
          </Button>
        </div>

        {vehiclesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="p-5 text-center">
                <FileText className="mx-auto h-8 w-8 text-primary/60" />
                <p className="mt-3 font-display text-2xl font-bold text-foreground">{vehicleOptions.length}</p>
                <p className="text-sm text-muted-foreground">Vehicles</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <FileText className="mx-auto h-8 w-8 text-blue-500/60" />
                <p className="mt-3 font-display text-2xl font-bold text-foreground">{driverOptions.length}</p>
                <p className="text-sm text-muted-foreground">Drivers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <FileText className="mx-auto h-8 w-8 text-emerald-500/60" />
                <p className="mt-3 font-display text-2xl font-bold text-foreground">{crewOptions.length}</p>
                <p className="text-sm text-muted-foreground">Crew</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
          <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h2 className="mt-3 font-semibold text-foreground">Upload a new document</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Select whether the document belongs to a vehicle, driver or crew member,
            then attach the scanned copy.
          </p>
          <Button className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
            <UploadCloud className="h-4 w-4" /> Choose Document
          </Button>
        </div>
      </main>

      <UploadDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicles={vehicleOptions}
        drivers={driverOptions}
        crew={crewOptions}
      />
    </div>
  );
};

export default OwnerComplianceUpload;
