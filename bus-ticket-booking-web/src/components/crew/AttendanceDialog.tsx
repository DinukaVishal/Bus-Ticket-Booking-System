import React, { useState, useEffect } from 'react';
import { useCrewMembers } from '@/hooks/useCrewMembers';
import { useUpsertCrewAttendance } from '@/hooks/useCrewAttendance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CalendarCheck } from 'lucide-react';
import type { AttendanceStatus } from '@/types/crew';

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crewId?: string | null;
  defaultDate?: string;
  existing?: {
    id: string;
    status: AttendanceStatus;
    notes: string | null;
  } | null;
}

/**
 * Mark / update crew attendance for a given crew member + date.
 * Uses upsert on the unique (crew_id, date) constraint.
 */
const AttendanceDialog = ({
  open,
  onOpenChange,
  crewId,
  defaultDate,
  existing,
}: AttendanceDialogProps) => {
  const { data: crewMembers = [] } = useCrewMembers();
  const upsertAttendance = useUpsertCrewAttendance();

  const today = new Date().toISOString().split('T')[0];

  const [selectedCrewId, setSelectedCrewId] = useState('');
  const [date, setDate] = useState(defaultDate || today);
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedCrewId(crewId || '');
      setDate(defaultDate || today);
      setStatus(existing?.status || 'present');
      setNotes(existing?.notes || '');
      setError('');
    }
  }, [open, crewId, defaultDate, existing, today]);

  const handleSubmit = async () => {
    if (!selectedCrewId) {
      setError('Please select a crew member.');
      return;
    }
    if (!date) {
      setError('Please select a date.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await upsertAttendance.mutateAsync({
        crewId: selectedCrewId,
        date,
        status,
        notes: notes || null,
        attendanceId: existing?.id || null,
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Crew Attendance
          </DialogTitle>
          <DialogDescription>
            Record attendance for a crew member on a specific date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Crew Member *</Label>
            <Select value={selectedCrewId} onValueChange={setSelectedCrewId}>
              <SelectTrigger>
                <SelectValue placeholder="Select crew member" />
              </SelectTrigger>
              <SelectContent>
                {crewMembers
                  .filter((c) => c.status === 'active')
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} ({c.crew_role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Attendance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceDialog;

