import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/support/constants';
import { useCategories } from '@/hooks/useSupport';
import type { TicketFilters as TicketFiltersType } from '@/types/support';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface TicketFiltersProps {
  value: TicketFiltersType;
  onChange: (filters: TicketFiltersType) => void;
  showStaffFilter?: boolean;
  staffOptions?: { id: string; display_name: string | null }[];
}

/**
 * Filter bar for ticket lists. Supports search by ticket number / subject,
 * status, priority, category, assigned staff and date range.
 */
export function TicketFilters({ value, onChange, showStaffFilter, staffOptions = [] }: TicketFiltersProps) {
  const { data: categories = [] } = useCategories();
  const [search, setSearch] = useState(value.search || '');

  const commitSearch = (term: string) => {
    onChange({ ...value, search: term.trim() || undefined });
  };

  const clear = () => {
    setSearch('');
    onChange({});
  };

  const hasActive =
    value.search || (value.status && value.status !== 'all') || (value.priority && value.priority !== 'all') ||
    (value.category && value.category !== 'all') || (value.assignedStaffId && value.assignedStaffId !== 'all') ||
    value.dateFrom || value.dateTo;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSearch(search);
            }}
            onBlur={() => commitSearch(search)}
            placeholder="Search ticket # or subject..."
            className="pl-9"
          />
        </div>

        <Select
          value={value.status || 'all'}
          onValueChange={(v) => onChange({ ...value, status: v === 'all' ? undefined : (v as any) })}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.priority || 'all'}
          onValueChange={(v) => onChange({ ...value, priority: v === 'all' ? undefined : (v as any) })}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {TICKET_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.category || 'all'}
          onValueChange={(v) => onChange({ ...value, category: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {showStaffFilter && (
          <Select
            value={value.assignedStaffId || 'all'}
            onValueChange={(v) => onChange({ ...value, assignedStaffId: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Assigned Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.display_name || 'Unnamed'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          type="date"
          value={value.dateFrom || ''}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value || undefined })}
          className="sm:w-44"
          title="From date"
        />
        <Input
          type="date"
          value={value.dateTo || ''}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value || undefined })}
          className="sm:w-44"
          title="To date"
        />

        <div className="flex items-center gap-2 sm:ml-auto">
          {hasActive && (
            <Button variant="ghost" size="sm" onClick={clear}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

