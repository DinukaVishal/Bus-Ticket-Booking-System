import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ComplianceDashboard as ComplianceDashboardData } from '@/types/compliance';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Timer,
  Hourglass,
  XCircle,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  valid: '#10b981',
  pending: '#f59e0b',
  expiring_soon: '#f97316',
  expired: '#ef4444',
  rejected: '#64748b',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

interface Counter {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}

function StatGrid({ stats }: { stats: ComplianceDashboardData }) {
  const counters: Counter[] = [
    { label: 'Total Documents', value: stats.total_documents, icon: <FileText className="h-5 w-5" />, tone: 'border-border/60' },
    { label: 'Valid', value: stats.valid_documents, icon: <ShieldCheck className="h-5 w-5" />, tone: 'border-l-4 border-l-emerald-500' },
    { label: 'Expired', value: stats.expired_documents, icon: <AlertTriangle className="h-5 w-5" />, tone: 'border-l-4 border-l-red-500' },
    { label: 'Expiring ≤ 30d', value: stats.expiring_30, icon: <Timer className="h-5 w-5" />, tone: 'border-l-4 border-l-orange-500' },
    { label: 'Pending Verification', value: stats.pending_verification, icon: <Hourglass className="h-5 w-5" />, tone: 'border-l-4 border-l-amber-500' },
    { label: 'Rejected', value: stats.rejected_documents, icon: <XCircle className="h-5 w-5" />, tone: 'border-l-4 border-l-slate-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {counters.map((c) => (
        <Card key={c.label} className={`p-5 ${c.tone}`}>
          <CardContent className="p-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-muted-foreground">{c.label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">{c.value}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {c.icon}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Compliance dashboard: stat cards, status distribution, document type
 * breakdown, monthly expirations and compliance rates.
 */
export function ComplianceDashboard({
  data,
  isLoading = false,
}: {
  data: ComplianceDashboardData | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-muted-foreground">No compliance data available.</p>
      </div>
    );
  }

  const byStatus = data.by_status || [];
  const byType = data.by_document_type || [];
  const monthly = data.monthly_expirations || [];

  return (
    <div className="space-y-6">
      <StatGrid stats={data} />

      <div className="flex flex-wrap gap-4">
        <Card className="flex-1 min-w-[220px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Vehicle Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold text-emerald-600">{data.vehicle_compliance_rate}%</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[220px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Driver Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold text-blue-600">{data.driver_compliance_rate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {byStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Documents by Status</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatus.map((s) => ({ ...s, fill: STATUS_COLORS[s.name] || CHART_COLORS[0] }))}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    label={(entry: any) => `${entry.name} (${entry.count})`}
                    labelLine={false}
                  >
                    {byStatus.map((s) => (
                      <Cell key={s.name} fill={STATUS_COLORS[s.name] || CHART_COLORS[0]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Compliance by Document Type</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {byType.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {monthly.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Monthly Expirations</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip cursor={{ stroke: 'var(--muted)' }} />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {data.by_owner && data.by_owner.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Compliance by Bus Owner</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_owner.map((o) => ({ ...o, name: o.owner_id.slice(0, 8) }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                  <Legend />
                  <Bar dataKey="valid" name="Valid" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expired" name="Expired" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
