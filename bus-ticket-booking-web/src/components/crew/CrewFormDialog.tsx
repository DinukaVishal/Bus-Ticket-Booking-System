import React, { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddCrewMember, useUpdateCrewMember } from '@/hooks/useCrewMembers';
import { validateCrewMember, FieldErrors } from '@/lib/crewValidation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Users } from 'lucide-react';
import type { CrewMemberRow } from '@/types/crew';

interface CrewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crew?: CrewMemberRow | null;
}

/**
 * Create / Edit Crew Member dialog.
 */
const CrewFormDialog = ({ open, onOpenChange, crew }: CrewFormDialogProps) => {
  const { isAdmin } = useAuthContext();
  const addCrew = useAddCrewMember();
  const updateCrew = useUpdateCrewMember();

  const isEditing = !!crew;

  const [form, setForm] = useState({
    fullName: crew?.full_name || '',
    nic: crew?.nic || '',
    phone: crew?.phone || '',
    email: crew?.email || '',
    address: crew?.address || '',
    emergencyContact: crew?.emergency_contact || '',
    crewRole: crew?.crew_role || 'conductor',
    status: crew?.status || 'active',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (open) {
      setForm({
        fullName: crew?.full_name || '',
        nic: crew?.nic || '',
        phone: crew?.phone || '',
        email: crew?.email || '',
        address: crew?.address || '',
        emergencyContact: crew?.emergency_contact || '',
        crewRole: crew?.crew_role || 'conductor',
        status: crew?.status || 'active',
      });
      setErrors({});
    }
  }, [open, crew]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const validationErrors = validateCrewMember({
      fullName: form.fullName,
      nic: form.nic,
      phone: form.phone,
      email: form.email || null,
      crewRole: form.crewRole,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && crew) {
        await updateCrew.mutateAsync({
          id: crew.id,
          fullName: form.fullName,
          nic: form.nic,
          phone: form.phone,
          email: form.email || null,
          address: form.address || null,
          emergencyContact: form.emergencyContact || null,
          crewRole: form.crewRole as 'conductor' | 'inspector' | 'assistant',
          status: form.status,
        });
      } else {
        await addCrew.mutateAsync({
          fullName: form.fullName,
          nic: form.nic,
          phone: form.phone,
          email: form.email || null,
          address: form.address || null,
          emergencyContact: form.emergencyContact || null,
          crewRole: form.crewRole as 'conductor' | 'inspector' | 'assistant',
          status: form.status,
        });
      }
      onOpenChange(false);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to save crew member.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {isEditing ? 'Edit Crew Member' : 'Add New Crew Member'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update crew member details.' : 'Register a new crew member (conductor, inspector or assistant).'}
            {isAdmin && !isEditing && ' Admins can create crew for any owner.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="e.g. Saman Silva"
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nic">NIC *</Label>
              <Input
                id="nic"
                value={form.nic}
                onChange={(e) => handleChange('nic', e.target.value)}
                placeholder="882345678V"
              />
              {errors.nic && <p className="text-xs text-destructive">{errors.nic}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+94771234567"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="crewRole">Role *</Label>
              <Select value={form.crewRole} onValueChange={(v) => handleChange('crewRole', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conductor">Conductor</SelectItem>
                  <SelectItem value="inspector">Inspector</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                </SelectContent>
              </Select>
              {errors.crewRole && <p className="text-xs text-destructive">{errors.crewRole}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="crew@example.com"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main St, Colombo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContact">Emergency Contact</Label>
            <Input
              id="emergencyContact"
              value={form.emergencyContact}
              onChange={(e) => handleChange('emergencyContact', e.target.value)}
              placeholder="+94771234568"
            />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {errors.submit && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {errors.submit}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isEditing ? 'Update Crew' : 'Add Crew'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CrewFormDialog;

