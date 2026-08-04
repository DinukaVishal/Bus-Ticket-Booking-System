import { useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import {
  SupportLayout,
  TicketFilters,
  TicketTable,
  TicketListSkeleton,
  StatCard,
  EmptyState,
} from '@/components/support';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useAssignedTickets } from '@/hooks/useSupport';
import { exportTicketsToCsv } from '@/lib/support/csvExport';
import type { TicketFilters as TicketFiltersType } from '@/types/support';
import { Download, ClipboardList, Loader2, Inbox, CheckCircle2, Timer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type TabValue = 'all' | 'open' | 'resolved' | 'escalated';

/**
 * Staff support desk. Shows tickets assigned to the current staff user
 * with filtering and CSV export.
 */
const StaffSupport = () => {
  const { data: tickets = [], isLoading, error } = useAssignedTickets();
  const [filters, setFilters] = useState<TicketFiltersType>({});
  const [tab, setTab] = useState<TabValue>('all');

  const filtered = useMemo(() => {
    let list = tickets;
    if (tab === 'open') list = list.filter((t) => !['Resolved', 'Closed'].includes(t.status));
    if (tab === 'resolved') list = list.filter((t) => t.status === 'Resolved' || t.status === 'Closed');
    if (tab === 'escalated') list = list.filter((t) => t.status === 'Escalated');

    if (filters.status && filters.status !== 'all') list = list.filter((t) => t.status === filters.status);
    if (filters.priority && filters.priority !== 'all') list = list.filter((t) => t.priority === filters.priority);
    if (filters.category && filters.category !== 'all') list = list.filter((t) => t.category === filters.category);
    if (filters.search) {
      const term = filters.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(term) ||
          t.subject.toLowerCase().includes(term) ||
          (t.profiles?.display_name || '').toLowerCase().includes(term),
      );
    }
    if (filters.dateFrom) {
      const from = new Date(`${filters.dateFrom}T00:00:00`).getTime();
      list = list.filter((t) => new Date(t.created_at).getTime() >= from);
    }
    if (filters.dateTo) {
      const to = new Date(`${filters.dateTo}T23:59:59`).getTime();
      list = list.filter((t) => new Date(t.created_at).getTime() <= to);
    }
    return list;
  }, [tickets, filters, tab]);

  const openCount = tickets.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
  const escalatedCount = tickets.filter((t) => t.status === 'Escalated').length;

  const handleExport = () => {
    if (filtered.length === 0) return;
    exportTicketsToCsv(filtered, `staff-assigned-tickets-${new Date().toISOString().slice(0, 10)}.csv`);
    toast({ title: 'Export started', description: `${filtered.length} ticket(s) exported to CSV.` });
  };

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SupportLayout title="My Support Desk" description="Tickets assigned to you.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Assigned" value={tickets.length} icon={<ClipboardList className="h-5 w-5" />} />
            <StatCard label="Open" value={openCount} icon={<Inbox className="h-5 w-5" />} tone="info" />
            <StatCard label="Resolved/Closed" value={resolvedCount} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
              onClick={handleExport}
              disabled={filtered.length === 0}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="space-y-4">
            <TabsList className="rounded-3xl border border-border/70 bg-background/40 p-1">
              <TabsTrigger value="all" className="gap-1.5 rounded-2xl">All ({tickets.length})</TabsTrigger>
              <TabsTrigger value="open" className="gap-1.5 rounded-2xl">Open ({openCount})</TabsTrigger>
              <TabsTrigger value="resolved" className="gap-1.5 rounded-2xl">Resolved ({resolvedCount})</TabsTrigger>
              <TabsTrigger value="escalated" className="gap-1.5 rounded-2xl">Escalated ({escalatedCount})</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="space-y-4">
              <TicketFilters value={filters} onChange={setFilters} />

              {isLoading ? (
                <TicketListSkeleton />
              ) : error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
                  Failed to load your assigned tickets.
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<Timer className="h-8 w-8" />}
                  title="No tickets here"
                  description="When tickets are assigned to you, they will appear here."
                />
              ) : (
                <TicketTable tickets={filtered} basePath="/support" showCustomer showAssigned />
              )}
            </TabsContent>
          </Tabs>
        </SupportLayout>
      </main>
    </div>
  );
};

export default StaffSupport;

