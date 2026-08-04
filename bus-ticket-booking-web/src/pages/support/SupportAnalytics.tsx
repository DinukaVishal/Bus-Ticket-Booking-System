import Header from '@/components/layout/Header';
import { SupportLayout, StatCard, AnalyticsCharts } from '@/components/support';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupportAnalytics } from '@/hooks/useSupport';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatDurationHours } from '@/lib/support/constants';
import {
  Ticket,
  Inbox,
  CheckCircle2,
  Timer,
  AlertOctagon,
  BarChart3,
  Star,
} from 'lucide-react';

const SupportAnalytics = () => {
  const { isAdmin } = useAuthContext();
  const { data: stats, isLoading, error } = useSupportAnalytics();

  if (isLoading) {
    return (
      <div className="min-h-screen page-shell page-bg">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <SupportLayout title="Support Analytics" description="Overview of support performance.">
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-2xl" />
                ))}
              </div>
            </div>
          </SupportLayout>
        </main>
      </div>
    );
  }

  if (error || !stats || (stats as any).error) {
    return (
      <div className="min-h-screen page-shell page-bg">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <SupportLayout title="Support Analytics" description="Overview of support performance.">
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <h2 className="mt-4 font-display text-lg font-bold text-foreground">Analytics unavailable</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                You need an admin or staff role to view support analytics. If you believe this is an error, contact your system administrator.
              </p>
            </div>
          </SupportLayout>
        </main>
      </div>
    );
  }

  const isStaffScoped = !isAdmin; // staff scoped analytics omit some fields

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SupportLayout title="Support Analytics" description="Measure resolution times, volume, and team performance.">
          {isStaffScoped && (
            <div className="rounded-2xl border border-blue-200/60 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/5 p-4 text-sm text-muted-foreground">
              Showing analytics for tickets assigned to you. Administrators see platform-wide data.
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total Tickets" value={stats.total_tickets} icon={<Ticket className="h-5 w-5" />} />
            <StatCard
              label="Open Tickets"
              value={stats.open_tickets}
              icon={<Inbox className="h-5 w-5" />}
              tone="info"
            />
            <StatCard
              label="Resolved Today"
              value={stats.resolved_today}
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone="success"
            />
            <StatCard
              label="Avg Resolution"
              value={formatDurationHours(stats.avg_resolution_hours)}
              icon={<Timer className="h-5 w-5" />}
              tone="warning"
            />
            <StatCard
              label="Critical Open"
              value={stats.critical_tickets}
              icon={<AlertOctagon className="h-5 w-5" />}
              tone="danger"
            />
          </div>

          <AnalyticsCharts stats={stats} />

          {stats.staff_performance && stats.staff_performance.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">Staff Resolution Summary</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {stats.staff_performance.map((s) => (
                  <div key={s.staff_id} className="rounded-xl border border-border/60 bg-background/40 p-4">
                    <p className="font-mono text-xs text-muted-foreground">Staff {s.staff_id?.slice(0, 8)}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-display text-xl font-bold text-foreground">{s.total}</span>
                      <span className="text-xs text-muted-foreground">assigned</span>
                    </div>
                    <div className="mt-1 text-sm text-emerald-600 font-medium">{s.resolved} resolved/closed</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SupportLayout>
      </main>
    </div>
  );
};

export default SupportAnalytics;

