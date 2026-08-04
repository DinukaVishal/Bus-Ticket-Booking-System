import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/compliance/constants';
import type { ExpiringDocument, InspectionSchedule } from '@/types/compliance';

interface ComplianceCalendarProps {
  expiring: ExpiringDocument[];
  inspections: InspectionSchedule[];
  isLoading?: boolean;
}

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  kind: 'renewal' | 'inspection' | 'insurance' | 'revenue' | 'expiry';
  color: string;
};

const KIND_META: Record<CalendarEvent['kind'], { label: string; color: string }> = {
  renewal: { label: 'Renewal', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  inspection: { label: 'Inspection', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  insurance: { label: 'Insurance', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  revenue: { label: 'Revenue License', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  expiry: { label: 'Expiry', color: 'bg-red-100 text-red-700 border-red-200' },
};

/**
 * Compliance calendar view showing upcoming expirations, renewals,
 * scheduled inspections, insurance and revenue license renewals.
 */
export function ComplianceCalendar({
  expiring,
  inspections,
  isLoading = false,
}: ComplianceCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);

  const events = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = [];

    expiring.forEach((d) => {
      if (!d.expiry_date) return;
      const kind: CalendarEvent['kind'] = d.document_type.toLowerCase().includes('insurance')
        ? 'insurance'
        : d.document_type.toLowerCase().includes('revenue')
          ? 'revenue'
          : 'expiry';
      list.push({
        id: `exp-${d.id}`,
        date: d.expiry_date,
        title: d.document_type,
        subtitle: `${d.document_number} · ${d.category} · ${d.days_remaining}d left`,
        kind,
        color: KIND_META[kind].color,
      });
    });

    inspections.forEach((i) => {
      list.push({
        id: `insp-${i.id}`,
        date: i.scheduled_date,
        title: i.title,
        subtitle: i.description || 'Scheduled inspection',
        kind: 'inspection',
        color: KIND_META.inspection.color,
      });
    });

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [expiring, inspections]);

  const now = new Date();
  const viewYear = now.getFullYear();
  const viewMonth = now.getMonth() + monthOffset;

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0 = Sunday

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const eventsForDate = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <CalendarIcon className="h-5 w-5 text-primary" />
          {monthLabel}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonthOffset((o) => o - 1)}>Prev</Button>
          <Button variant="outline" size="sm" onClick={() => setMonthOffset(0)}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => setMonthOffset((o) => o + 1)}>Next</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1 text-center text-xs font-semibold text-muted-foreground">{d}</div>
        ))}

        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="min-h-[88px] rounded-xl border border-dashed border-border/40" />;

          const dayEvents = eventsForDate(day);
          const isToday =
            day === now.getDate() && monthOffset === 0;

          return (
            <div
              key={day}
              className={cn(
                'min-h-[88px] rounded-xl border p-1.5 transition-colors',
                isToday ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-card/40',
                dayEvents.length > 0 && 'border-primary/20'
              )}
            >
              <div className={cn('mb-1 text-xs font-semibold', isToday ? 'text-primary' : 'text-muted-foreground')}>
                {day}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <div key={e.id} className={cn('rounded-md border px-1.5 py-0.5 text-[10px] leading-tight', e.color)}>
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="truncate text-[9px] opacity-80">{e.subtitle}</p>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[9px] text-muted-foreground">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No upcoming compliance events.</p>
          ) : (
            events.slice(0, 12).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/40 p-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{e.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.subtitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className={e.color}>{e.kind}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
