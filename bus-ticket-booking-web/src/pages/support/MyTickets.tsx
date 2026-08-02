import { useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import {
  SupportLayout,
  TicketFilters,
  TicketTable,
  TicketListSkeleton,
  EmptyState,
} from '@/components/support';
import { Button } from '@/components/ui/button';
import { useMyTickets } from '@/hooks/useSupport';
import { exportTicketsToCsv } from '@/lib/support/csvExport';
import type { TicketFilters as TicketFiltersType } from '@/types/support';
import { Download, Ticket, PlusCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const MyTickets = () => {
  const { data: tickets = [], isLoading, error } = useMyTickets();
  const [filters, setFilters] = useState<TicketFiltersType>({});

  const filtered = useMemo(() => {
    let list = tickets;
    if (filters.status && filters.status !== 'all') list = list.filter((t) => t.status === filters.status);
    if (filters.priority && filters.priority !== 'all') list = list.filter((t) => t.priority === filters.priority);
    if (filters.category && filters.category !== 'all') list = list.filter((t) => t.category === filters.category);
    if (filters.search) {
      const term = filters.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(term) ||
          t.subject.toLowerCase().includes(term) ||
          (t.category || '').toLowerCase().includes(term),
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
  }, [tickets, filters]);

  const handleExport = () => {
    if (filtered.length === 0) return;
    exportTicketsToCsv(filtered, `my-support-tickets-${new Date().toISOString().slice(0, 10)}.csv`);
    toast({ title: 'Export started', description: `${filtered.length} ticket(s) exported to CSV.` });
  };

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SupportLayout
          title="My Tickets"
          description="Track and manage your support requests."
          actions={
            <Button asChild className="gap-2 rounded-full">
              <Link to="/support/create">
                <PlusCircle className="h-4 w-4" /> New Ticket
              </Link>
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex justify-between gap-3 items-center">
              <TicketFilters value={filters} onChange={setFilters} />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full shrink-0"
                onClick={handleExport}
                disabled={filtered.length === 0}
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>

            {isLoading ? (
              <TicketListSkeleton />
            ) : error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
                Failed to load your tickets. Please refresh the page.
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Ticket className="h-8 w-8" />}
                title="No tickets found"
                description={
                  tickets.length === 0
                    ? 'You have not created any support tickets yet.'
                    : 'No tickets match your current filters.'
                }
                action={tickets.length === 0 ? { label: 'Create a ticket', to: '/support/create' } : undefined}
              />
            ) : (
              <TicketTable tickets={filtered} basePath="/support" />
            )}
          </div>
        </SupportLayout>
      </main>
    </div>
  );
};

export default MyTickets;

