/**
 * Compliance & Regulatory Management module types.
 * Mirrors the schema defined in supabase/migrations/20260524_add_compliance_system.sql
 */

// ---------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------

export type ComplianceStatus =
  | 'pending'
  | 'valid'
  | 'expiring_soon'
  | 'expired'
  | 'rejected';

export type ComplianceCategory = 'vehicle' | 'driver' | 'crew';

export type ComplianceEntityType = 'vehicle' | 'driver' | 'crew';

export type VerificationAction = 'approved' | 'rejected' | 'resubmission';

export type InspectionStatus = 'scheduled' | 'completed' | 'cancelled';

// ---------------------------------------------------------------------
// Base rows
// ---------------------------------------------------------------------

export interface DocumentType {
  id: string;
  name: string;
  category: ComplianceCategory;
  code: string;
  description: string | null;
  required: boolean;
  renewal_months: number | null;
  active: boolean;
  created_at: string;
}

export interface ComplianceDocument {
  id: string;
  owner_id: string;
  document_type_id: string;
  entity_type: ComplianceEntityType;
  vehicle_id: string | null;
  driver_id: string | null;
  crew_id: string | null;
  document_number: string;
  issue_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  file_url: string | null;
  file_path: string | null;
  status: ComplianceStatus;
  notes: string | null;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** ComplianceDocument joined with related tables for list views */
export interface ComplianceDocumentRow extends ComplianceDocument {
  document_type?: DocumentType | null;
  vehicle?: {
    id: string;
    bus_number: string;
    bus_type: string;
    registration_number: string;
  } | null;
  driver?: {
    id: string;
    full_name: string;
    license_number: string;
  } | null;
  crew?: {
    id: string;
    full_name: string;
    crew_role: string;
  } | null;
  owner?: {
    id: string;
    display_name: string | null;
    email?: string | null;
  } | null;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  file_url: string | null;
  file_path: string | null;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface DocumentVersionRow extends DocumentVersion {
  uploader?: {
    display_name: string | null;
    email?: string | null;
  } | null;
}

export interface DocumentVerification {
  id: string;
  document_id: string;
  verified_by: string;
  action: VerificationAction;
  notes: string | null;
  verified_at: string;
}

export interface DocumentVerificationRow extends DocumentVerification {
  verifier?: {
    display_name: string | null;
    email?: string | null;
  } | null;
}

export interface ComplianceNotification {
  id: string;
  document_id: string;
  recipient_id: string;
  type: 'expiring' | 'expired' | 'rejected' | 'verified' | 'renewal_reminder';
  message: string | null;
  sent_at: string;
  notification_id: string | null;
}

export interface ComplianceAuditLog {
  id: string;
  document_id: string | null;
  actor_id: string | null;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export interface RequiredDocument {
  id: string;
  owner_id: string;
  entity_type: ComplianceEntityType;
  entity_id: string;
  document_type_id: string;
  is_mandatory: boolean;
  created_at: string;
}

export interface ComplianceScore {
  id: string;
  owner_id: string;
  entity_type: 'vehicle' | 'driver' | 'crew' | 'overall';
  entity_id: string | null;
  score: number;
  valid_count: number;
  required_count: number;
  calculated_at: string;
}

export interface InspectionSchedule {
  id: string;
  owner_id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  scheduled_date: string;
  title: string;
  description: string | null;
  status: InspectionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------
// Dashboard / Analytics shapes
// ---------------------------------------------------------------------

export interface DashboardCounts {
  total_documents: number;
  valid_documents: number;
  expired_documents: number;
  expiring_30: number;
  pending_verification: number;
  rejected_documents: number;
  vehicle_compliance_rate: number;
  driver_compliance_rate: number;
}

export interface ComplianceDashboard extends DashboardCounts {
  by_status?: { name: string; count: number }[];
  by_document_type?: { name: string; count: number }[];
  monthly_expirations?: { month: string; count: number }[];
  by_owner?: {
    owner_id: string;
    valid: number;
    expired: number;
    total: number;
    score: number;
  }[];
}

export interface ExpiringDocument {
  id: string;
  document_number: string;
  document_type: string;
  category: ComplianceCategory;
  entity_type: ComplianceEntityType;
  vehicle_id: string | null;
  driver_id: string | null;
  crew_id: string | null;
  expiry_date: string | null;
  status: ComplianceStatus;
  owner_id: string;
  days_remaining: number;
}

export interface ComplianceReport {
  expired?: ComplianceReportRow[];
  upcoming?: ComplianceReportRow[];
  missing?: {
    entity_type: ComplianceEntityType;
    entity_id: string;
    document_name: string;
  }[];
}

export interface ComplianceReportRow {
  id?: string;
  document_number?: string;
  document_type?: string;
  entity_type?: ComplianceEntityType;
  expiry_date?: string | null;
  owner_id?: string;
  days_remaining?: number;
}

// ---------------------------------------------------------------------
// Inputs / filters
// ---------------------------------------------------------------------

export interface UploadDocumentInput {
  ownerId: string;
  entityType: ComplianceEntityType;
  vehicleId?: string | null;
  driverId?: string | null;
  crewId?: string | null;
  documentTypeId: string;
  documentNumber: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  issuingAuthority?: string | null;
  notes?: string | null;
  file: File;
}

export interface ComplianceFilters {
  search?: string;
  ownerId?: string;
  vehicleId?: string;
  driverId?: string;
  entityType?: ComplianceEntityType | 'all';
  documentTypeId?: string | 'all';
  status?: ComplianceStatus | 'all';
  expiryFrom?: string;
  expiryTo?: string;
  province?: string;
}

export interface InspectionInput {
  ownerId: string;
  vehicleId?: string | null;
  driverId?: string | null;
  scheduledDate: string;
  title: string;
  description?: string | null;
}

