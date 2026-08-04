import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { SupportLayout, StatCard } from '@/components/support';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyTickets, useUnreadCount } from '@/hooks/useSupport';
import { useAuthContext } from '@/contexts/AuthContext';
import { CATEGORY_EMOJI, formatDateTime } from '@/lib/support/constants';
import {
  LifeBuoy,
  PlusCircle,
  Ticket,
  Inbox,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  Bell,
} from 'lucide-react';

const SupportDashboard = () => {
  const { profile } = useAuthContext();
  const { data: tickets = [], isLoading } = useMyTickets();
  const { data: unread = 0 } = useUnreadCount();

  const recentTickets = tickets.slice(0, 5);

  const openCount = tickets.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved').length;
  const closedCount = tickets.filter((t) => t.status === 'Closed').length;
  const criticalCount = tickets.filter((t) => t.priority === 'Critical' && !['Resolved', 'Closed'].includes(t.status)).length;

  const firstName = (profile?.displayName || 'there').split(' ')[0];

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SupportLayout title="Support Home" description="Get help with bookings, payments, and more.">
          {/* Welcome banner */}
          <div className="rounded-3xl gradient-hero text-white p-6 md:p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute right-20 bottom-0 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="text-accent font-medium">Welcome back{firstName ? `, ${firstName}` : ''} 👋</p>
                <h2 className="mt-1 font-display text-xl md:text-2xl font-bold">How can we help you today?</h2>
                <p className="mt-1 text-white/80 text-sm">
                  Create a support ticket and our team will get back to you quickly.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" className="gap-2 rounded-full">
                  <Link to="/support/create">
                    <PlusCircle className="h-4 w-4" /> Create Ticket
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="gap-2 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/10">
                  <Link to="/support/my-tickets">
                    <Ticket className="h-4 w-4" /> My Tickets
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Tickets" value={tickets.length} icon={<Ticket className="h-5 w-5" />} />
              <StatCard
                label="Open"
                value={openCount}
                icon={<Inbox className="h-5 w-5" />}
                tone="info"
              />
              <StatCard
                label="Resolved"
                value={resolvedCount}
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="success"
              />
              <StatCard
                label="Unread Alerts"
                value={unread}
                icon={<Bell className="h-5 w-5" />}
                tone="default"
              />
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent tickets */}
            <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/70 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Recent Tickets</h3>
                </div>
                <Button asChild variant="ghost" size="sm" className="gap-1 rounded-full">
                  <Link to="/support/my-tickets">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-xl" />
                  ))}
                </div>
              ) : recentTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <LifeBuoy className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-muted-foreground">No tickets yet</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    When you need help, create a support ticket and we'll jump in.
                  </p>
                  <Button asChild className="mt-4 gap-2 rounded-full">
                    <Link to="/support/create">
                      <PlusCircle className="h-4 w-4" /> Create your first ticket
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      to={`/support/${ticket.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/60"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base">
                        {CATEGORY_EMOJI[ticket.category] || '📋'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">{ticket.ticket_number}</span>
                          {ticket.priority === 'Critical' && (
                            <Badge variant="destructive" className="text-[10px] px-1.5">Critical</Badge>
                          )}
                        </div>
                        <p className="truncate text-sm font-medium text-foreground">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(ticket.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge
                          variant={ticket.status === 'Resolved' ? 'outline' : 'secondary'}
                          className="text-[11px] capitalize"
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick help */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Quick Help</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Refund a booking', to: '/support/create', hint: 'Category: Refund Request' },
                    { label: 'Report a payment problem', to: '/support/create', hint: 'Category: Payment Problem' },
                    { label: 'Report a delayed bus', to: '/support/create', hint: 'Category: Bus Delay' },
                    { label: 'Update my account details', to: '/profile', hint: 'Go to profile' },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="block rounded-xl border border-border/60 bg-background/40 p-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                    >
                      {item.label}
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{item.hint}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5 p-5">
                <p className="text-sm font-semibold text-foreground">🎧 Need urgent help?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Critical tickets like payment problems are prioritized. Mark issues clearly in your description.
                </p>
              </div>
            </div>
          </div>
        </SupportLayout>
      </main>
    </div>
  );
};

export default SupportDashboard;

