import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ComplianceLayout, ComplianceCalendar } from '@/components/compliance';
import { useExpiringDocuments, useInspections, useCreateInspection, useOwnerList } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { PlusCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/**
 * Admin compliance calendar page (/admin/compliance/calendar).
 * Shows upcoming expirations, renewals and scheduled inspections, plus
 * a dialog to schedule new inspections.
 */
const AdminComplianceCalendar = () => {
  const { user } = useAuth();
  const [ownerFilter, setOwnerFilter] = useState<string | undefined>(undefined);
  const { data: expiring = [], isLoading: expiringLoading } = useExpiringDocuments(90, ownerFilter);
  const { data: inspections = [], isLoading: inspectionsLoading } = useInspections(ownerFilter);
  const { data: owners = [] } = useOwnerList();
  const createInspection = useCreateInspection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!user) return;
    if (!title || !date) {
      toast({ title: 'Missing fields', description: 'Title and date are required.', variant: 'destructive' });
      return;
    }
    try {
      await createInspection.mutateAsync({
        ownerId: ownerFilter || user.id,
        scheduledDate: date,
        title,
        description: description || null,
      });
      toast({ title: 'Inspection scheduled', description: 'The inspection was added to the calendar.' });
      setTitle('');
      setDate('');
      setDescription('');
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message || 'Failed to schedule inspection.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ComplianceLayout
          title="Compliance Calendar"
          description="Upcoming expirations, renewals and scheduled inspections."
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
              <Button className="gap-2" onClick={() => setDialogOpen(true)}>
                <PlusCircle className="h-4 w-4" /> Schedule Inspection
              </Button>
            </div>

<ComplianceCalendar
              expiring={expiring}
              inspections={inspections}
              isLoading={expiringLoading || inspectionsLoading}
            />
          </div>
        </ComplianceLayout>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Inspection</DialogTitle>
            <DialogDescription>Add a compliance inspection or renewal event to the calendar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual vehicle inspection" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createInspection.isPending}>
              {createInspection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminComplianceCalendar;
