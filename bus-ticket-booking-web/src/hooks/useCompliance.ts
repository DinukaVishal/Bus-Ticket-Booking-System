import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  ComplianceDocument,
  ComplianceFilters,
  ComplianceReport,
  InspectionInput,
  UploadDocumentInput,
  VerificationAction,
} from '@/types/compliance';
import {
  createDocument,
  createInspection,
  fetchAuditLogs,
  fetchComplianceReport,
  fetchComplianceScore,
  fetchDashboard,
  fetchDocumentById,
  fetchDocumentTypes,
  fetchDocumentVersions,
  fetchDocuments,
  fetchExpiringDocuments,
  fetchInspections,
  fetchOwnerList,
  fetchVerifications,
  replaceDocumentFile,
  updateInspectionStatus,
  verifyDocument,
} from '@/lib/compliance/complianceApi';

// ---------------------------------------------------------------------
// Realtime subscription helper
// ---------------------------------------------------------------------

function useRealtimeInvalidate(table: string, queryKeys: string[][]) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`compliance-${table}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, table, JSON.stringify(queryKeys)]);
}

// ---------------------------------------------------------------------
// Document types
// ---------------------------------------------------------------------

export function useDocumentTypes() {
  return useQuery({
    queryKey: ['compliance-document-types'],
    queryFn: fetchDocumentTypes,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------

export function useComplianceDocuments(filters?: ComplianceFilters, ownerId?: string) {
  const { user, isAdmin, isBusOwner, isLoading: authLoading } = useAuth();
  const key = ['compliance-documents', ownerId || 'all', JSON.stringify(filters || {})];
  useRealtimeInvalidate('compliance_documents', [key]);

  return useQuery({
    queryKey: key,
    enabled: !!user && !authLoading && (isAdmin || isBusOwner),
    queryFn: () => fetchDocuments(filters, ownerId),
  });
}

export function useComplianceDocument(documentId?: string) {
  const { user, isLoading: authLoading } = useAuth();
  useRealtimeInvalidate('compliance_documents', [['compliance-document', documentId]]);

  return useQuery({
    queryKey: ['compliance-document', documentId],
    enabled: !!documentId && !!user && !authLoading,
    queryFn: () => fetchDocumentById(documentId as string),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadDocumentInput) => createDocument(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-documents'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-score'] });
    },
  });
}

export function useReplaceDocumentFile(documentId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, notes }: { file: File; notes?: string }) =>
      replaceDocumentFile(documentId as string, file, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-documents'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-document', documentId] });
      queryClient.invalidateQueries({ queryKey: ['compliance-versions', documentId] });
    },
  });
}

// ---------------------------------------------------------------------
// Versions & history
// ---------------------------------------------------------------------

export function useDocumentVersions(documentId?: string) {
  const { user, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ['compliance-versions', documentId],
    enabled: !!documentId && !!user && !authLoading,
    queryFn: () => fetchDocumentVersions(documentId as string),
  });
}

// ---------------------------------------------------------------------
// Verifications
// ---------------------------------------------------------------------

export function useDocumentVerifications(documentId?: string) {
  const { user, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ['compliance-verifications', documentId],
    enabled: !!documentId && !!user && !authLoading,
    queryFn: () => fetchVerifications(documentId as string),
  });
}

export function useVerifyDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      action,
      notes,
    }: {
      documentId: string;
      action: VerificationAction;
      notes?: string;
    }) => verifyDocument(documentId, action, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-documents'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-verifications'] });
    },
  });
}

// ---------------------------------------------------------------------
// Dashboard / analytics
// ---------------------------------------------------------------------

export function useComplianceDashboard(ownerId?: string) {
  const { user, isAdmin, isBusOwner, isLoading: authLoading } = useAuth();
  useRealtimeInvalidate('compliance_documents', [['compliance-dashboard', ownerId || 'all']]);

  return useQuery({
    queryKey: ['compliance-dashboard', ownerId || 'all'],
    enabled: !!user && !authLoading && (isAdmin || isBusOwner),
    queryFn: () => fetchDashboard(ownerId),
  });
}

export function useExpiringDocuments(days = 90, ownerId?: string) {
  const { user, isAdmin, isBusOwner, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ['compliance-expiring', days, ownerId || 'all'],
    enabled: !!user && !authLoading && (isAdmin || isBusOwner),
    queryFn: () => fetchExpiringDocuments(days, ownerId),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useComplianceReport(ownerId?: string) {
  const { user, isAdmin, isBusOwner, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ['compliance-report', ownerId || 'all'],
    enabled: !!user && !authLoading && (isAdmin || isBusOwner),
    queryFn: () => fetchComplianceReport(ownerId),
  });
}

export function useComplianceScore(ownerId?: string) {
  const { user, isAdmin, isBusOwner, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ['compliance-score', ownerId || 'all'],
    enabled: !!user && !authLoading && (isAdmin || isBusOwner),
    queryFn: () => fetchComplianceScore(ownerId),
  });
}

// ---------------------------------------------------------------------
// Inspections
// ---------------------------------------------------------------------

export function useInspections(ownerId?: string) {
  const { user, isAdmin, isBusOwner, isLoading: authLoading } = useAuth();
  useRealtimeInvalidate('inspection_schedules', [['compliance-inspections', ownerId || 'all']]);

  return useQuery({
    queryKey: ['compliance-inspections', ownerId || 'all'],
    enabled: !!user && !authLoading && (isAdmin || isBusOwner),
    queryFn: () => fetchInspections(ownerId),
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InspectionInput) => createInspection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-calendar'] });
    },
  });
}

export function useUpdateInspectionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'scheduled' | 'completed' | 'cancelled' }) =>
      updateInspectionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-calendar'] });
    },
  });
}

// ---------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------

export function useAuditLogs(documentId?: string) {
  const { user, isAdmin, isBusOwner, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ['compliance-audit', documentId || 'all'],
    enabled: !!user && !authLoading && (isAdmin || isBusOwner),
    queryFn: () => fetchAuditLogs(documentId),
  });
}

// ---------------------------------------------------------------------
// Owners (admin filter dropdown)
// ---------------------------------------------------------------------

export function useOwnerList() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ['compliance-owners'],
    enabled: !!user && !authLoading && isAdmin,
    queryFn: fetchOwnerList,
  });
}

// Re-exports for convenience
export type { ComplianceReport, UploadDocumentInput, ComplianceDocument };

