import React, { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddDriver, useUpdateDriver } from '@/hooks/useDrivers';
import { validateDriver, FieldErrors } from '@/lib/crewValidation';
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
import { Loader2, UserRound } from 'lucide-react';
import type { DriverRow } from '@/types/crew';

interface DriverFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: DriverRow | null;
}

/**
 * Create / Edit Driver dialog.
 * Uses the same fields available to Admin and Bus Owner.
 */
const DriverFormDialog = ({ open, onOpenChange, driver }: DriverFormDialogProps) => {
  const { isAdmin } = useAuthContext();
  const addDriver = useAddDriver();
  const updateDriver = useUpdateDriver();

  const isEditing = !!driver;

  const [form, setForm] = useState({
    fullName: driver?.full_name || '',
    nic: driver?.nic || '',
    phone: driver?.phone || '',
    email: driver?.email || '',
    address: driver?.address || '',
    licenseNumber: driver?.license_number || '',
    licenseExpiryDate: driver?.license_expiry_date || '',
    dateOfBirth: driver?.date_of_birth || '',
    emergencyContact: driver?.emergency_contact || '',
    status: driver?.status || 'available',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever the dialog is opened for a different driver.
  React.useEffect(() => {
    if (open) {
      setForm({
        fullName: driver?.full_name || '',
        nic: driver?.nic || '',
        phone: driver?.phone || '',
        email: driver?.email || '',
        address: driver?.address || '',
        licenseNumber: driver?.license_number || '',
        licenseExpiryDate: driver?.license_expiry_date || '',
        dateOfBirth: driver?.date_of_birth || '',
        emergencyContact: driver?.emergency_contact || '',
        status: driver?.status || 'available',
      });
      setErrors({});
    }
  }, [open, driver]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const validationErrors = validateDriver({
      fullName: form.fullName,
      nic: form.nic,
      phone: form.phone,
      email: form.email || null,
      licenseNumber: form.licenseNumber,
      licenseExpiryDate: form.licenseExpiryDate,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && driver) {
        await updateDriver.mutateAsync({
          id: driver.id,
          fullName: form.fullName,
          nic: form.nic,
          phone: form.phone,
          email: form.email || null,
          address: form.address || null,
          licenseNumber: form.licenseNumber,
          licenseExpiryDate: form.licenseExpiryDate,
          dateOfBirth: form.dateOfBirth || null,
          emergencyContact: form.emergencyContact || null,
          status: form.status,
        });
      } else {
        await addDriver.mutateAsync({
          fullName: form.fullName,
          nic: form.nic,
          phone: form.phone,
          email: form.email || null,
          address: form.address || null,
          licenseNumber: form.licenseNumber,
          licenseExpiryDate: form.licenseExpiryDate,
          dateOfBirth: form.dateOfBirth || null,
          emergencyContact: form.emergencyContact || null,
          status: form.status,
        });
      }
      onOpenChange(false);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to save driver.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="w-5 h-5 text-primary" />
            {isEditing ? 'Edit Driver' : 'Add New Driver'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update driver details.' : 'Register a new driver for your fleet.'}
            {isAdmin && !isEditing && ' Admins can create drivers for any owner.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="e.g. Nimal Perera"
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

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="driver@example.com"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number *</Label>
              <Input
                id="licenseNumber"
                value={form.licenseNumber}
                onChange={(e) => handleChange('licenseNumber', e.target.value)}
                placeholder="B1234567"
              />
              {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseExpiryDate">License Expiry *</Label>
              <Input
                id="licenseExpiryDate"
                type="date"
                value={form.licenseExpiryDate}
                onChange={(e) => handleChange('licenseExpiryDate', e.target.value)}
              />
              {errors.licenseExpiryDate && <p className="text-xs text-destructive">{errors.licenseExpiryDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
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
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
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
            {isEditing ? 'Update Driver' : 'Add Driver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriverFormDialog;

