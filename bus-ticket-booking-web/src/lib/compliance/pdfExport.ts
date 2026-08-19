import { jsPDF } from 'jspdf';
import type { ComplianceDocumentRow, ComplianceReport } from '@/types/compliance';

/** Column widths for the documents table (A4 portrait). */
const COLUMN_WIDTHS = [42, 40, 30, 30, 30, 28, 30, 30];
const PAGE_HEIGHT = 297;

/**
 * Generates a PDF report of compliance documents and triggers a download.
 */
export function exportDocumentsToPdf(
  documents: ComplianceDocumentRow[],
  title = 'Compliance Documents Report'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const headers = ['Number', 'Type', 'Entity', 'Vehicle', 'Driver', 'Crew', 'Status', 'Expiry'];

  let y = 20;
  doc.setFontSize(16);
  doc.text(title, 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
  doc.setTextColor(0);
  y += 8;

  // Header row
  doc.setFillColor(230, 230, 230);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let x = 14;
  headers.forEach((h, i) => {
    doc.text(h, x + 1, y + 5);
    x += COLUMN_WIDTHS[i];
  });
  doc.setFont('helvetica', 'normal');
  y += 8;

  documents.forEach((d) => {
    if (y > PAGE_HEIGHT - 20) {
      doc.addPage();
      y = 20;
    }
    const row = [
      d.document_number,
      d.document_type?.name || '',
      d.entity_type,
      d.vehicle?.bus_number || '',
      d.driver?.full_name || '',
      d.crew?.full_name || '',
      d.status,
      d.expiry_date || '',
    ];
    x = 14;
    row.forEach((cell, i) => {
      const str = String(cell ?? '').slice(0, 18);
      doc.text(str, x + 1, y + 5);
      x += COLUMN_WIDTHS[i];
    });
    y += 7;
  });

  doc.save(`compliance-documents-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generates a PDF compliance report (expired / upcoming / missing) and
 * triggers a download.
 */
export function exportComplianceReportToPdf(
  report: ComplianceReport,
  title = 'Compliance Report'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 20;
  doc.setFontSize(16);
  doc.text(title, 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
  doc.setTextColor(0);
  y += 8;

  const sections: { key: 'expired' | 'upcoming'; label: string }[] = [
    { key: 'expired', label: 'Expired Documents' },
    { key: 'upcoming', label: 'Upcoming Renewals (90 days)' },
  ];

  sections.forEach(({ key, label }) => {
    const rows = report[key] || [];
    if (y > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    rows.forEach((r) => {
      if (y > PAGE_HEIGHT - 20) {
        doc.addPage();
        y = 20;
      }
      const line = `${r.document_number || ''} | ${r.document_type || ''} | ${r.entity_type || ''} | ${r.expiry_date || ''}${r.days_remaining != null ? ` | ${r.days_remaining}d` : ''}`;
      doc.text(line.slice(0, 100), 14, y);
      y += 5;
    });
    y += 6;
  });

  // Missing documents
  if (report.missing && report.missing.length > 0) {
    if (y > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Missing Documents', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    report.missing.forEach((m) => {
      if (y > PAGE_HEIGHT - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${m.entity_type} | ${m.document_name}`, 14, y);
      y += 5;
    });
  }

  doc.save(`compliance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
