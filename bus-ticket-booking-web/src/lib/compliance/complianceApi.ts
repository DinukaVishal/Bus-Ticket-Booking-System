import { supabase } from '@/integrations/supabase/client';
import type {
  ComplianceDashboard,
  ComplianceDocument,
  ComplianceDocumentRow,
  ComplianceFilters,
  ComplianceReport,
  ComplianceScore,
  DocumentType,
  DocumentVerification,
  DocumentVerificationRow,
  DocumentVersion,
  DocumentVersionRow,
  ExpiringDocument,
  InspectionSchedule,
  UploadDocumentInput,
} from '@/types/compliance';
import {
  ALLOWED_DOCUMENT_TYPES,
  CATEGORY_LABELS,
  MAX_DOCUMENT_SIZE,
} from './constants';

/**
 * API layer for the Compliance & Regulatory Management module.
 * All functions use the authenticated Supabase client; RLS enforces
 * owner / admin / staff scoping at the database level.
 */

const DOCUMENT_SELECT = `
  *,
  document_type:document_type_id (id, name, category, code, description, required, renewal_months),
  vehicle:vehicle_id (id, bus_number, bus_type, registration_number),
  driver:driver_id (id, full_name, license_number),
  crew:crew_id (id, full_name, crew_role),
  owner:owner_id (id, display_name, email)
`;

// ---------------------------------------------------------------------
// Document types
// ---------------------------------------------------------------------

export async function fetchDocumentTypes(): Promise<DocumentType[]> {
  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('name');
  if (error) throw error;
  return (data || []) as DocumentType[];
}

// ---------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------

export async function fetchDocuments(
  filters?: ComplianceFilters,
  ownerId?: string
): Promise<ComplianceDocumentRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('compliance_documents')
    .select<string, ComplianceDocumentRow>(DOCUMENT_SELECT);

  // Owner scoping: when ownerId is provided (admin filter) or when the
  // caller is a bus owner, scope to that owner. RLS also enforces this.
  if (ownerId) {
    query = query.eq('owner_id', ownerId);
  } else if (filters?.ownerId && filters.ownerId !== 'all') {
    query = query.eq('owner_id', filters.ownerId);
  }

  if (filters?.entityType && filters.entityType !== 'all') {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters?.documentTypeId && filters.documentTypeId !== 'all') {
    query = query.eq('document_type_id', filters.documentTypeId);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.vehicleId) {
    query = query.eq('vehicle_id', filters.vehicleId);
  }
  if (filters?.driverId) {
    query = query.eq('driver_id', filters.driverId);
  }
  if (filters?.expiryFrom) {
    query = query.gte('expiry_date', filters.expiryFrom);
  }
  if (filters?.expiryTo) {
    query = query.lte('expiry_date', filters.expiryTo);
  }
  if (filters?.search) {
    const term = filters.search.trim();
    if (term) {
      query = query.or(`document_number.ilike.%${term}%,notes.ilike.%${term}%`);
    }
  }

  const { data, error } = await query.order('expiry_date', { ascending: true });
  if (error) throw error;
  return (data || []) as ComplianceDocumentRow[];
}

export async function fetchDocumentById(id: string): Promise<ComplianceDocumentRow | null> {
  const { data, error } = await supabase
    .from('compliance_documents')
    .select<string, ComplianceDocumentRow>(DOCUMENT_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Upload a compliance document to the compliance-documents storage bucket.
 * Path layout: {ownerId}/{category}/{entityId}/{timestamp}-{filename}
 */
export async function uploadDocumentFile(
  input: UploadDocumentInput
): Promise<{ filePath: string; fileUrl: string }> {
  if (!ALLOWED_DOCUMENT_TYPES.includes(input.file.type)) {
    throw new Error('Only PDF, JPG and PNG files are allowed.');
  }
  if (input.file.size > MAX_DOCUMENT_SIZE) {
    throw new Error('Document must be 10 MB or smaller.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to upload documents.');

  const category = CATEGORY_LABELS[input.entityType].toLowerCase();
  const entityId =
    input.vehicleId || input.driverId || input.crewId || 'general';

  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${input.ownerId}/${category}/${entityId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('compliance-documents')
    .upload(path, input.file, {
      cacheControl: '3600',
      contentType: input.file.type,
    });

  if (uploadError) throw uploadError;

  // Generate a signed URL (bucket is private) - valid for 60 minutes.
  const { data: signedUrl, error: signError } = await supabase.storage
    .from('compliance-documents')
    .createSignedUrl(path, 60 * 60);

  if (signError) throw signError;

  return {
    filePath: path,
    fileUrl: signedUrl?.signedUrl || '',
  };
}

export async function createDocument(input: UploadDocumentInput): Promise<ComplianceDocument> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in.');

  const { filePath, fileUrl } = await uploadDocumentFile(input);

  const { data, error } = await supabase
    .from('compliance_documents')
    .insert({
      owner_id: input.ownerId,
      document_type_id: input.documentTypeId,
      entity_type: input.entityType,
      vehicle_id: input.vehicleId || null,
      driver_id: input.driverId || null,
      crew_id: input.crewId || null,
      document_number: input.documentNumber,
      issue_date: input.issueDate || null,
      expiry_date: input.expiryDate || null,
      issuing_authority: input.issuingAuthority || null,
      file_url: fileUrl,
      file_path: filePath,
      notes: input.notes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ComplianceDocument;
}

/**
 * Replace an existing document with a new file, preserving version history.
 * Adds a new entry to document_versions and updates the primary file refs.
 */
export async function replaceDocumentFile(
  documentId: string,
  file: File,
  notes?: string
): Promise<ComplianceDocument> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in.');

  const existing = await fetchDocumentById(documentId);
  if (!existing) throw new Error('Document not found.');

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    throw new Error('Only PDF, JPG and PNG files are allowed.');
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error('Document must be 10 MB or smaller.');
  }

  const category = CATEGORY_LABELS[existing.entity_type].toLowerCase();
  const entityId =
    existing.vehicle_id || existing.driver_id || existing.crew_id || 'general';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${existing.owner_id}/${category}/${entityId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('compliance-documents')
    .upload(path, file, { cacheControl: '3600', contentType: file.type });
  if (uploadError) throw uploadError;

  const { data: signedUrl, error: signError } = await supabase.storage
    .from('compliance-documents')
    .createSignedUrl(path, 60 * 60);
  if (signError) throw signError;

  // Insert a new version row
  const { data: version } = await supabase
    .from('document_versions')
    .insert({
      document_id: documentId,
      version: 0, // computed by unique constraint fallback below
      file_url: signedUrl?.signedUrl || '',
      file_path: path,
      uploaded_by: user.id,
      notes: notes || null,
    })
    .select()
    .single();

  // If version 0 insert failed due to unique, compute next version
  if (!version) {
    const { data: versions } = await supabase
      .from('document_versions')
      .select('version')
      .eq('document_id', documentId)
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = (versions?.[0]?.version || 0) + 1;
    await supabase.from('document_versions').insert({
      document_id: documentId,
      version: nextVersion,
      file_url: signedUrl?.signedUrl || '',
      file_path: path,
      uploaded_by: user.id,
      notes: notes || null,
    });
  }

  // Update the primary document
  const { data, error } = await supabase
    .from('compliance_documents')
    .update({
      file_url: signedUrl?.signedUrl || '',
      file_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) throw error;
  return data as ComplianceDocument;
}

// ---------------------------------------------------------------------
// Versions & history
// ---------------------------------------------------------------------

export async function fetchDocumentVersions(documentId: string): Promise<DocumentVersionRow[]> {
  const { data, error } = await supabase
    .from('document_versions')
    .select<string, DocumentVersionRow>(
      `*,
      uploader:uploaded_by (display_name, email)`
    )
    .eq('document_id', documentId)
    .order('version', { ascending: false });
  if (error) throw error;
  return (data || []) as DocumentVersionRow[];
}

// ---------------------------------------------------------------------
// Verifications
// ---------------------------------------------------------------------

export async function fetchVerifications(documentId: string): Promise<DocumentVerificationRow[]> {
  const { data, error } = await supabase
    .from('document_verifications')
    .select<string, DocumentVerificationRow>(
      `*,
      verifier:verified_by (display_name, email)`
    )
    .eq('document_id', documentId)
    .order('verified_at', { ascending: false });
  if (error) throw error;
  return (data || []) as DocumentVerificationRow[];
}

export async function verifyDocument(
  documentId: string,
  action: 'approved' | 'rejected' | 'resubmission',
  notes?: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  const { data, error } = await supabase.rpc('verify_document', {
    _document_id: documentId,
    _action: action,
    _notes: notes || null,
  });
  if (error) throw error;
  return (data || { success: false }) as { success: boolean; status?: string; error?: string };
}

// ---------------------------------------------------------------------
// Dashboard / analytics
// ---------------------------------------------------------------------

export async function fetchDashboard(ownerId?: string): Promise<ComplianceDashboard | null> {
  const { data, error } = await supabase.rpc('get_compliance_dashboard', {
    _owner_id: ownerId || null,
  });
  if (error) throw error;
  if (data && (data as any).error) return null;
  return (data ?? null) as ComplianceDashboard | null;
}

export async function fetchExpiringDocuments(
  days = 90,
  ownerId?: string
): Promise<ExpiringDocument[]> {
  const { data, error } = await supabase.rpc('get_expiring_documents', {
    _days: days,
    _owner_id: ownerId || null,
  });
  if (error) throw error;
  return (data || []) as ExpiringDocument[];
}

export async function fetchComplianceReport(ownerId?: string): Promise<ComplianceReport | null> {
  const { data, error } = await supabase.rpc('generate_compliance_report', {
    _report_type: 'all',
    _owner_id: ownerId || null,
  });
  if (error) throw error;
  if (data && (data as any).error) return null;
  return (data ?? null) as ComplianceReport | null;
}

export async function fetchComplianceScore(ownerId?: string): Promise<ComplianceScore | null> {
  const { data, error } = await supabase.rpc('calculate_compliance_score', {
    _owner_id: ownerId || null,
  });
  if (error) throw error;
  if (data && (data as any).error) return null;
  return (data ?? null) as ComplianceScore | null;
}

// ---------------------------------------------------------------------
// Inspections
// ---------------------------------------------------------------------

export async function fetchInspections(ownerId?: string): Promise<InspectionSchedule[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase.from('inspection_schedules').select('*');
  if (ownerId) {
    query = query.eq('owner_id', ownerId);
  }
  const { data, error } = await query.order('scheduled_date', { ascending: true });
  if (error) throw error;
  return (data || []) as InspectionSchedule[];
}

export async function createInspection(input: {
  ownerId: string;
  vehicleId?: string | null;
  driverId?: string | null;
  scheduledDate: string;
  title: string;
  description?: string | null;
}): Promise<InspectionSchedule> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in.');

  const { data, error } = await supabase
    .from('inspection_schedules')
    .insert({
      owner_id: input.ownerId,
      vehicle_id: input.vehicleId || null,
      driver_id: input.driverId || null,
      scheduled_date: input.scheduledDate,
      title: input.title,
      description: input.description || null,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data as InspectionSchedule;
}

export async function updateInspectionStatus(
  id: string,
  status: 'scheduled' | 'completed' | 'cancelled'
): Promise<void> {
  const { error } = await supabase
    .from('inspection_schedules')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------

export async function fetchAuditLogs(documentId?: string) {
  let query = supabase
    .from('compliance_audit_logs')
    .select('*, actor:actor_id (display_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (documentId) {
    query = query.eq('document_id', documentId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------
// Owners list (for admin filters)
// ---------------------------------------------------------------------

export async function fetchOwnerList(): Promise<{ id: string; display_name: string | null }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, display_name');
  if (error) throw error;
  return (data || []).map((p) => ({ id: p.user_id, display_name: p.display_name }));
}

// Re-exports for convenience
export type { DocumentVerification };
