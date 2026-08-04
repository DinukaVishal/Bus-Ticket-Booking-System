import type { ComplianceDocumentRow, ComplianceReport } from '@/types/compliance';

/**
 * Exports compliance documents to CSV and triggers a browser download.
 */
export function exportDocumentsToCsv(
  documents: ComplianceDocumentRow[],
  filename = 'compliance-documents.csv'
) {
  const headers = [
    'Document Number',
    'Document Type',
    'Category',
    'Entity',
    'Vehicle',
    'Driver',
    'Crew',
    'Issue Date',
    'Expiry Date',
    'Issuing Authority',
    'Status',
    'Verified',
    'Owner',
    'Created At',
  ];

  const rows = documents.map((d) => [
    d.document_number,
    d.document_type?.name || '',
    d.entity_type,
    d.entity_type,
    d.vehicle?.bus_number || '',
    d.driver?.full_name || '',
    d.crew?.full_name || '',
    d.issue_date || '',
    d.expiry_date || '',
    d.issuing_authority || '',
    d.status,
    d.verified ? 'Yes' : 'No',
    d.owner?.display_name || d.owner_id || '',
    d.created_at,
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          if (/[",\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Shorthand helper to export a compliance report (expired/upcoming) to CSV. */
export function exportReportToCsv(
  report: ComplianceReport,
  section: 'expired' | 'upcoming',
  filename = `compliance-${section}.csv`
) {
  const rows = report[section] || [];
  const headers = ['Document Number', 'Document Type', 'Entity', 'Expiry Date', 'Days Remaining'];
  const data = rows.map((r) => [
    r.document_number || '',
    r.document_type || '',
    r.entity_type || '',
    r.expiry_date || '',
    r.days_remaining != null ? String(r.days_remaining) : '',
  ]);

  const csv = [headers, ...data]
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
          return str;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
