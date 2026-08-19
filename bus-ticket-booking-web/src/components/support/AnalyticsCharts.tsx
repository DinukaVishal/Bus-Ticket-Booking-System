import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/support/constants';
import type { TicketStats } from '@/types/support';

const STATUS_COLORS: Record<string, string> = {
  Open: '#3b82f6',
  'In Progress': '#f59e0b',
  'Waiting for Customer': '#8b5cf6',
  Resolved: '#10b981',
  Closed: '#64748b',
  Escalated: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#94a3b8',
  Medium: '#3b82f6',
  High: '#f97316',
  Critical: '#dc2626',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

/**
 * Analytics dashboard charts for the Support module.
 * Renders category distribution, status, priority, monthly trends, and
 * staff performance. Charts are responsive and use the project's recharts
 * theme.
 */
export function AnalyticsCharts({ stats }: { stats: TicketStats }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {stats.by_category && stats.by_category.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tickets by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.by_category} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {stats.by_category.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {stats.by_status && stats.by_status.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tickets by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.by_status.map((s) => ({ ...s, fill: STATUS_COLORS[s.name as string] || CHART_COLORS[0] }))}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  label={(entry: any) => `${entry.name} (${entry.count})`}
                  labelLine={false}
                >
                  {stats.by_status.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLORS[s.name as string] || CHART_COLORS[0]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {stats.by_priority && stats.by_priority.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tickets by Priority</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.by_priority} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stats.by_priority.map((p) => (
                    <Cell key={p.name} fill={PRIORITY_COLORS[p.name as string] || CHART_COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {stats.monthly_tickets && stats.monthly_tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly Tickets</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.monthly_tickets.map((m) => ({ ...m, monthLabel: m.month }))}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip cursor={{ stroke: 'var(--muted)' }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {stats.staff_performance && stats.staff_performance.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Staff Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.staff_performance.map((s) => ({ ...s, name: s.staff_id?.slice(0, 8) || 'unassigned' }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                <Legend />
                <Bar dataKey="total" name="Total Assigned" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved/Closed" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {(!stats.by_category || stats.by_category.length === 0) &&
        (!stats.by_status || stats.by_status.length === 0) && (
          <Card className="lg:col-span-2">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Not enough data to render charts yet.
            </CardContent>
          </Card>
        )}
    </div>
  );
}

export { STATUS_COLORS, PRIORITY_COLORS };

