import type {
  ComplianceCategory,
  ComplianceStatus,
  ComplianceEntityType,
} from '@/types/compliance';

/**
 * Shared constants, label maps and styling helpers for the Compliance module.
 */

export const COMPLIANCE_STATUSES: ComplianceStatus[] = [
  'pending',
  'valid',
  'expiring_soon',
  'expired',
  'rejected',
];

export const ENTITY_TYPES: ComplianceEntityType[] = ['vehicle', 'driver', 'crew'];

export const CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  vehicle: 'Vehicle',
  driver: 'Driver',
  crew: 'Crew',
};

export const ENTITY_LABELS: Record<ComplianceEntityType, string> = {
  vehicle: 'Vehicle',
  driver: 'Driver',
  crew: 'Crew',
};

/** Maps a ComplianceStatus to badge classes + dot color. */
export const STATUS_STYLES: Record<
  ComplianceStatus,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  valid: {
    label: 'Valid',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  expiring_soon: {
    label: 'Expiring Soon',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
  expired: {
    label: 'Expired',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
};

export const STATUS_ORDER: ComplianceStatus[] = [
  'pending',
  'valid',
  'expiring_soon',
  'expired',
  'rejected',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

/** Human-friendly expiry calculation for upcoming window chips. */
export function daysUntil(expiry?: string | null): number | null {
  if (!expiry) return null;
  const d = new Date(expiry);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function formatDate(date?: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(date?: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
