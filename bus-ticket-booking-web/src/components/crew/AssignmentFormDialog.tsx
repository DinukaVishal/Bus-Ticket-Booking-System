import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAssignDriverCrew } from '@/hooks/useBusAssignments';
import { useDrivers } from '@/hooks/useDrivers';
import { useCrewMembers } from '@/hooks/useCrewMembers';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, GitBranch } from 'lucide-react';

interface BusOption {
  id: string;
  bus_number: string;
  bus_type: string;
}

interface RouteOption {
  id: string;
  name: string;
  from_city: string;
  to_city: string;
}

interface ScheduleOption {
  id: string;
  departure_time: string;
  price: number;
}

interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create a new Bus Assignment (driver/crew -> bus/route/schedule).
 * Uses the assign_driver_crew RPC for validation + creation.
 */
const AssignmentFormDialog = ({ open, onOpenChange }: AssignmentFormDialogProps) => {
  const { user, isAdmin } = useAuthContext();
  const assignMutation = useAssignDriverCrew();
  const { data: drivers = [] } = useDrivers();
  const { data: crewMembers = [] } = useCrewMembers();

  const [buses, setBuses] = useState<BusOption[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);

  const [ownerId, setOwnerId] = useState('');
  const [busId, setBusId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [crewId, setCrewId] = useState('');
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load buses/routes/owners when dialog opens.
  useEffect(() => {
    if (!open) return;

    // Default owner for bus owners is themselves; admins pick an owner.
    const effectiveOwner = isAdmin ? ownerId || user?.id || '' : user?.id || '';
    setOwnerId((prev) => (isAdmin ? prev || effectiveOwner : effectiveOwner));

    // Reset dependent fields.
    setBusId('');
    setRouteId('');
    setScheduleId('');
    setDriverId('');
    setCrewId('');
    setError('');

    loadOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdmin, user?.id]);

  // Reload buses when owner changes.
  useEffect(() => {
    if (!open || !ownerId) {
      setBuses([]);
      return;
    }
    loadBuses(ownerId);
    setBusId('');
    setRouteId('');
    setScheduleId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ownerId]);

  // Reload routes when bus changes.
  useEffect(() => {
    if (!open || !busId) {
      setRoutes([]);
      setSchedules([]);
      return;
    }
    loadRoutes(busId);
    setRouteId('');
    setScheduleId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busId]);

  // Reload schedules when route changes.
  useEffect(() => {
    if (!open || !routeId) {
      setSchedules([]);
      return;
    }
    loadSchedules(routeId);
    setScheduleId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routeId]);

  const loadOwners = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .order('display_name');
      // Only show owners who actually have buses.
      const { data: buses } = await supabase.from('owner_buses').select('bus_owner_id');
      const ownerIds = new Set((buses || []).map((b: any) => b.bus_owner_id));
      const filtered = (data || [])
        .filter((p: any) => ownerIds.has(p.user_id))
        .map((p: any) => ({ id: p.user_id, name: p.display_name || 'Unnamed Owner' }));
      setOwners(filtered);
    } catch {
      setOwners([]);
    }
  };

  const loadBuses = async (owner: string) => {
    try {
      const { data } = await supabase
        .from('owner_buses')
        .select('id, bus_number, bus_type')
        .eq('bus_owner_id', owner)
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('bus_number');
      setBuses((data || []) as BusOption[]);
    } catch {
      setBuses([]);
    }
  };

  const loadRoutes = async (bus: string) => {
    try {
      const { data } = await supabase
        .from('owner_routes')
        .select('route_id, routes(id, name, from_city, to_city)')
        .eq('owner_bus_id', bus)
        .eq('is_active', true);
      const mapped = (data || [])
        .map((entry: any) => entry.routes)
        .filter(Boolean) as RouteOption[];
      setRoutes(mapped);
    } catch {
      setRoutes([]);
    }
  };

  const loadSchedules = async (route: string) => {
    try {
      const { data } = await supabase
        .from('trips')
        .select('id, departure_time, price')
        .eq('route_id', route)
        .eq('is_active', true)
        .order('departure_time');
      setSchedules((data || []) as ScheduleOption[]);
    } catch {
      setSchedules([]);
    }
  };

  const availableDrivers = drivers.filter(
    (d) => (d.status === 'available' || d.status === 'assigned') && d.owner_id === (isAdmin ? ownerId : user?.id)
  );

  const availableCrew = crewMembers.filter(
    (c) => c.status === 'active' && c.owner_id === (isAdmin ? ownerId : user?.id)
  );

  const handleSubmit = async () => {
    if (!ownerId || !busId || !routeId) {
      setError('Please select an owner, bus and route.');
      return;
    }
    if (!driverId && !crewId) {
      setError('Select at least a driver or a crew member.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await assignMutation.mutateAsync({
        ownerId,
        busId,
        routeId,
        scheduleId: scheduleId || null,
        driverId: driverId || null,
        crewId: crewId || null,
        assignedDate,
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Create Bus Assignment
          </DialogTitle>
          <DialogDescription>
            Assign a driver and/or crew member to a bus, route and schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isAdmin && (
            <div className="space-y-2">
              <Label>Bus Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bus *</Label>
              <Select value={busId} onValueChange={setBusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bus_number} ({b.bus_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Route *</Label>
              <Select value={routeId} onValueChange={setRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Schedule (Trip)</Label>
              <Select value={scheduleId} onValueChange={setScheduleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {schedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.departure_time} • LKR {s.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Date</Label>
              <Input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name} ({d.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Crew Member</Label>
              <Select value={crewId} onValueChange={setCrewId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {availableCrew.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} ({c.crew_role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            Create Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentFormDialog;

