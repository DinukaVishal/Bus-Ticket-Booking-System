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
import { useAllTickets, useStaffUsers } from '@/hooks/useSupport';
import { exportTicketsToCsv } from '@/lib/support/csvExport';
import type { TicketFilters as TicketFiltersType } from '@/types/support';
import {
  Download,
  LifeBuoy,
  Ticket,
  Inbox,
  CheckCircle2,
  Loader2,
  Hourglass,
  AlertOctagon,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

type TabValue = 'all' | 'open' | 'pending' | 'resolved';

/**
 * Admin support dashboard: all tickets, stats, search & filters, tabs,
 * CSV export and quick links to categories/analytics.
 */
const AdminSupport = () => {
  const [filters, setFilters] = useState<TicketFiltersType>({});
  const [tab, setTab] = useState<TabValue>('all');
  const { data: tickets = [], isLoading, error } = useAllTickets(filters);
  const { data: staffUsers = [] } = useStaffUsers();

  const openCount = tickets.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length;
  const pendingCount = tickets.filter((t) => t.status === 'Open' || t.status === 'Waiting for Customer').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
  const criticalCount = tickets.filter((t) => t.priority === 'Critical' && !['Resolved', 'Closed'].includes(t.status)).length;
  const escalatedCount = tickets.filter((t) => t.status === 'Escalated').length;

  const filteredByTab = useMemo(() => {
    if (tab === 'all') return tickets;
    if (tab === 'open') return tickets.filter((t) => !['Resolved', 'Closed'].includes(t.status));
    if (tab === 'pending') return tickets.filter((t) => t.status === 'Open' || t.status === 'Waiting for Customer');
    if (tab === 'resolved') return tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed');
    return tickets;
  }, [tickets, tab]);

  const handleExport = () => {
    if (filteredByTab.length === 0) return;
    exportTicketsToCsv(filteredByTab, `admin-support-tickets-${new Date().toISOString().slice(0, 10)}.csv`);
    toast({ title: 'Export started', description: `${filteredByTab.length} ticket(s) exported to CSV.` });
  };

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SupportLayout
          title="Support Administration"
          description="Manage all support tickets across the platform."
          actions={
            <>
              <Button asChild variant="outline" className="gap-2 rounded-full">
                <Link to="/admin/support/categories">
                  Categories
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 rounded-full">
                <Link to="/admin/support/analytics">
                  Analytics
                </Link>
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total" value={tickets.length} icon={<Ticket className="h-5 w-5" />} />
            <StatCard label="Open" value={openCount} icon={<Inbox className="h-5 w-5" />} tone="info" />
            <StatCard label="Pending" value={pendingCount} icon={<Hourglass className="h-5 w-5" />} tone="warning" />
            <StatCard label="Resolved/Closed" value={resolvedCount} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
            <StatCard
              label="Critical"
              value={criticalCount}
              icon={<AlertOctagon className="h-5 w-5" />}
              tone="danger"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
              onClick={handleExport}
              disabled={filteredByTab.length === 0}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="space-y-4">
            <TabsList className="rounded-3xl border border-border/70 bg-background/40 p-1 flex-wrap h-auto">
              <TabsTrigger value="all" className="gap-1.5 rounded-2xl">All ({tickets.length})</TabsTrigger>
              <TabsTrigger value="open" className="gap-1.5 rounded-2xl">Open ({openCount})</TabsTrigger>
              <TabsTrigger value="pending" className="gap-1.5 rounded-2xl">Pending ({pendingCount})</TabsTrigger>
              <TabsTrigger value="resolved" className="gap-1.5 rounded-2xl">Resolved ({resolvedCount})</TabsTrigger>
              {escalatedCount > 0 && (
                <TabsTrigger value="all" className="gap-1.5 rounded-2xl text-red-600">Escalated ({escalatedCount})</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value={tab} className="space-y-4">
              <TicketFilters value={filters} onChange={setFilters} showStaffFilter staffOptions={staffUsers} />

              {isLoading ? (
                <TicketListSkeleton />
              ) : error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
                  Failed to load support tickets. Please refresh.
                </div>
              ) : filteredByTab.length === 0 ? (
                <EmptyState
                  icon={<LifeBuoy className="h-8 w-8" />}
                  title="No tickets found"
                  description="Create filters to narrow down, or check back later."
                />
              ) : (
                <TicketTable tickets={filteredByTab} basePath="/support" showCustomer showAssigned />
              )}
            </TabsContent>
          </Tabs>
        </SupportLayout>
      </main>
    </div>
  );
};

export default AdminSupport;

