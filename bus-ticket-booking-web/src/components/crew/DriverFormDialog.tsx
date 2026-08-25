import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddDriver, useUpdateDriver } from '@/hooks/useDrivers';
import { validateDriver, FieldErrors } from '@/lib/crewValidation';
import { supabase } from '@/integrations/supabase/client';
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
import { Loader2, UserRound, Bus } from 'lucide-react';
import type { DriverRow } from '@/types/crew';

interface DriverFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: DriverRow | null;
}

interface BusOption {
  id: string;
  bus_number: string;
  bus_type: string;
}

/**
 * Create / Edit Driver dialog.
 * Supports assigning bus, full validation, and seamless syncing.
 */
const DriverFormDialog = ({ open, onOpenChange, driver }: DriverFormDialogProps) => {
  const { user, isAdmin } = useAuthContext();
  const addDriver = useAddDriver();
  const updateDriver = useUpdateDriver();

  const isEditing = !!driver;

  const [buses, setBuses] = useState<BusOption[]>([]);
  const [busesLoading, setBusesLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: driver?.full_name || '',
    nic: driver?.nic === 'Registered' ? '' : driver?.nic || '',
    phone: driver?.phone || '',
    email: driver?.email || '',
    address: driver?.address || '',
    licenseNumber: driver?.license_number?.startsWith('DL-') ? '' : driver?.license_number || '',
    licenseExpiryDate: driver?.license_expiry_date || '',
    dateOfBirth: driver?.date_of_birth || '',
    emergencyContact: driver?.emergency_contact || '',
    status: driver?.status || 'available',
    busId: driver?.bus_id || 'none',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch buses for assignment
  useEffect(() => {
    if (!open) return;

    const fetchBuses = async () => {
      try {
        setBusesLoading(true);
        let query = supabase.from('owner_buses').select('id, bus_number, bus_type');
        if (!isAdmin && user?.id) {
          query = query.eq('bus_owner_id', user.id);
        }
        const { data } = await query.order('bus_number');
        setBuses(data || []);
      } catch (err) {
        console.warn('Failed to load buses for assignment:', err);
      } finally {
        setBusesLoading(false);
      }
    };

    fetchBuses();
  }, [open, isAdmin, user?.id]);

  // Reset form whenever the dialog is opened for a different driver.
  useEffect(() => {
    if (open) {
      setForm({
        fullName: driver?.full_name || '',
        nic: driver?.nic === 'Registered' ? '' : driver?.nic || '',
        phone: driver?.phone || '',
        email: driver?.email || '',
        address: driver?.address || '',
        licenseNumber: driver?.license_number?.startsWith('DL-') ? '' : driver?.license_number || '',
        licenseExpiryDate: driver?.license_expiry_date || '',
        dateOfBirth: driver?.date_of_birth || '',
        emergencyContact: driver?.emergency_contact || '',
        status: driver?.status || 'available',
        busId: driver?.bus_id || 'none',
      });
      setErrors({});
    }
  }, [open, driver]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const effectiveNic = form.nic.trim() || 'Registered';
    const effectiveLicense = form.licenseNumber.trim() || (form.phone ? `DL-${form.phone.replace(/\D/g, '').slice(-6)}` : 'DL-VERIFIED');

    const validationErrors = validateDriver({
      fullName: form.fullName,
      nic: effectiveNic,
      phone: form.phone,
      email: form.email || null,
      licenseNumber: effectiveLicense,
      licenseExpiryDate: form.licenseExpiryDate,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const selectedBusId = form.busId && form.busId !== 'none' ? form.busId : null;

      if (isEditing && driver) {
        await updateDriver.mutateAsync({
          id: driver.id,
          fullName: form.fullName.trim(),
          nic: effectiveNic,
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          licenseNumber: effectiveLicense,
          licenseExpiryDate: form.licenseExpiryDate || undefined,
          dateOfBirth: form.dateOfBirth || null,
          emergencyContact: form.emergencyContact.trim() || null,
          status: selectedBusId && form.status === 'available' ? 'assigned' : form.status,
          busId: selectedBusId,
        });
      } else {
        await addDriver.mutateAsync({
          fullName: form.fullName.trim(),
          nic: effectiveNic,
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          licenseNumber: effectiveLicense,
          licenseExpiryDate: form.licenseExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dateOfBirth: form.dateOfBirth || null,
          emergencyContact: form.emergencyContact.trim() || null,
          status: selectedBusId ? 'assigned' : form.status,
          busId: selectedBusId,
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
            {isEditing ? 'Update driver details and fleet assignment.' : 'Register a new driver for your bus fleet.'}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="0771234567 or +94771234567"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nic">NIC (National ID)</Label>
              <Input
                id="nic"
                value={form.nic}
                onChange={(e) => handleChange('nic', e.target.value)}
                placeholder="e.g. 199012345678 or 901234567V"
              />
              {errors.nic && <p className="text-xs text-destructive">{errors.nic}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Driving License Number</Label>
              <Input
                id="licenseNumber"
                value={form.licenseNumber}
                onChange={(e) => handleChange('licenseNumber', e.target.value)}
                placeholder="e.g. B1234567"
              />
              {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseExpiryDate">License Expiry Date</Label>
              <Input
                id="licenseExpiryDate"
                type="date"
                value={form.licenseExpiryDate}
                onChange={(e) => handleChange('licenseExpiryDate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="busId" className="flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5 text-primary" />
                Assign Bus
              </Label>
              <Select value={form.busId} onValueChange={(v) => handleChange('busId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={busesLoading ? 'Loading buses...' : 'Select a bus (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Not Assigned</SelectItem>
                  {buses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bus_number} ({b.bus_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
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
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input
                id="emergencyContact"
                value={form.emergencyContact}
                onChange={(e) => handleChange('emergencyContact', e.target.value)}
                placeholder="+94771234568"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (Optional)</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="e.g. Colombo Road, Kandy"
            />
          </div>

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
            {isEditing ? 'Update Driver' : 'Save Driver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriverFormDialog;
