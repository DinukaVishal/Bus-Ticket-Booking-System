import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { COMPLIANCE_STATUSES, ENTITY_TYPES } from '@/lib/compliance/constants';
import type { ComplianceFilters as ComplianceFiltersType } from '@/types/compliance';

interface ComplianceFiltersProps {
  value: ComplianceFiltersType;
  onChange: (filters: ComplianceFiltersType) => void;
  owners?: { id: string; display_name: string | null }[];
  documentTypes?: { id: string; name: string; category: string }[];
  showOwnerFilter?: boolean;
}

/**
 * Filter bar for compliance documents: search, entity type, document type,
 * status, owner and expiry range. Mirrors the Support TicketFilters UX.
 */
export function ComplianceFilters({
  value,
  onChange,
  owners = [],
  documentTypes = [],
  showOwnerFilter = false,
}: ComplianceFiltersProps) {
  const update = (patch: Partial<ComplianceFiltersType>) => onChange({ ...value, ...patch });

  const hasActiveFilters =
    value.search ||
    (value.entityType && value.entityType !== 'all') ||
    (value.documentTypeId && value.documentTypeId !== 'all') ||
    (value.status && value.status !== 'all') ||
    value.expiryFrom ||
    value.expiryTo ||
    (value.ownerId && value.ownerId !== 'all');

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search document # or notes..."
            value={value.search || ''}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        {showOwnerFilter && (
          <Select
            value={value.ownerId || 'all'}
            onValueChange={(v) => update({ ownerId: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.display_name || o.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={value.entityType || 'all'}
          onValueChange={(v) => update({ entityType: v === 'all' ? undefined : (v as any) })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.documentTypeId || 'all'}
          onValueChange={(v) => update({ documentTypeId: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {documentTypes.map((dt) => (
              <SelectItem key={dt.id} value={dt.id}>
                {dt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.status || 'all'}
          onValueChange={(v) => update({ status: v === 'all' ? undefined : (v as any) })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {COMPLIANCE_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={value.expiryFrom || ''}
          onChange={(e) => update({ expiryFrom: e.target.value || undefined })}
          className="w-[150px]"
          title="Expiry from"
        />
        <Input
          type="date"
          value={value.expiryTo || ''}
          onChange={(e) => update({ expiryTo: e.target.value || undefined })}
          className="w-[150px]"
          title="Expiry to"
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() =>
              onChange({
                search: undefined,
                ownerId: undefined,
                entityType: undefined,
                documentTypeId: undefined,
                status: undefined,
                expiryFrom: undefined,
                expiryTo: undefined,
              })
            }
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
