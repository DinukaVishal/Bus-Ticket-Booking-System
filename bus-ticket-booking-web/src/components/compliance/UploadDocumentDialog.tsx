import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UploadCloud } from 'lucide-react';
import { useDocumentTypes, useUploadDocument } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE } from '@/lib/compliance/constants';
import type { ComplianceEntityType } from '@/types/compliance';
import { toast } from '@/hooks/use-toast';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEntityType?: ComplianceEntityType;
  vehicles?: { id: string; bus_number: string }[];
  drivers?: { id: string; full_name: string }[];
  crew?: { id: string; full_name: string }[];
}

/**
 * Dialog for uploading a compliance document (vehicle/driver/crew).
 * Validates file type and size, then uploads to Supabase Storage and
 * creates the compliance_documents record.
 */
export function UploadDocumentDialog({
  open,
  onOpenChange,
  defaultEntityType,
  vehicles = [],
  drivers = [],
  crew = [],
}: UploadDocumentDialogProps) {
  const { user } = useAuth();
  const { data: documentTypes = [] } = useDocumentTypes();
  const uploadMutation = useUploadDocument();

  const [entityType, setEntityType] = useState<ComplianceEntityType>(defaultEntityType || 'vehicle');
  const [entityId, setEntityId] = useState<string>('');
  const [documentTypeId, setDocumentTypeId] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const filteredTypes = documentTypes.filter((dt) => dt.category === entityType);
  const entityOptions =
    entityType === 'vehicle'
      ? vehicles
      : entityType === 'driver'
        ? drivers
        : crew;

  const reset = () => {
    setEntityType(defaultEntityType || 'vehicle');
    setEntityId('');
    setDocumentTypeId('');
    setDocumentNumber('');
    setIssueDate('');
    setExpiryDate('');
    setIssuingAuthority('');
    setNotes('');
    setFile(null);
    setFileError(null);
  };

  const handleFileChange = (selected: File | undefined) => {
    setFileError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_DOCUMENT_TYPES.includes(selected.type)) {
      setFileError('Only PDF, JPG and PNG files are allowed.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_DOCUMENT_SIZE) {
      setFileError('Document must be 10 MB or smaller.');
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    if (!documentTypeId || !documentNumber || !entityId || !file) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields and attach a file.', variant: 'destructive' });
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        ownerId: user.id,
        entityType,
        vehicleId: entityType === 'vehicle' ? entityId : null,
        driverId: entityType === 'driver' ? entityId : null,
        crewId: entityType === 'crew' ? entityId : null,
        documentTypeId,
        documentNumber,
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        issuingAuthority: issuingAuthority || null,
        notes: notes || null,
        file,
      });
      toast({ title: 'Document uploaded', description: 'Your compliance document was uploaded successfully.' });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Failed to upload document.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" /> Upload Compliance Document
          </DialogTitle>
          <DialogDescription>
            Upload a scanned copy of a legal document. PDF, JPG or PNG up to 10 MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={(v) => { setEntityType(v as ComplianceEntityType); setEntityId(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="crew">Crew</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Entity</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {'bus_number' in e ? e.bus_number : ('full_name' in e ? e.full_name : '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Document Type</Label>
            <Select value={documentTypeId} onValueChange={setDocumentTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {filteredTypes.map((dt) => (
                  <SelectItem key={dt.id} value={dt.id}>
                    {dt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Document Number</Label>
            <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="e.g. REG-123456" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Issue Date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Issuing Authority</Label>
            <Input value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} placeholder="e.g. DMT, Provincial Council" />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          <div className="space-y-1.5">
            <Label>File</Label>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e.target.files?.[0])} />
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
