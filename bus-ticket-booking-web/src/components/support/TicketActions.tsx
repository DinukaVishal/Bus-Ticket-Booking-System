import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  useAssignTicket,
  useStaffUsers,
  useUpdateTicketPriority,
  useUpdateTicketStatus,
} from '@/hooks/useSupport';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/support/constants';
import type { SupportTicket, TicketPriority, TicketStatus } from '@/types/support';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface TicketActionsProps {
  ticket: SupportTicket;
}

/**
 * Staff/Admin panel to change ticket status, priority, and assignment.
 */
export function TicketActions({ ticket }: TicketActionsProps) {
  const { isAdmin, isStaff } = useAuthContext();
  const canManage = isAdmin || isStaff;

  const updateStatus = useUpdateTicketStatus();
  const updatePriority = useUpdateTicketPriority();
  const assign = useAssignTicket();
  const { data: staffUsers = [] } = useStaffUsers();

  const [statusBusy, setStatusBusy] = useState(false);
  const [priorityBusy, setPriorityBusy] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

  const handleStatus = async (status: TicketStatus) => {
    setStatusBusy(true);
    try {
      await updateStatus.mutateAsync({ ticketId: ticket.id, status });
      toast({ title: 'Status updated', description: `Ticket is now ${status}.` });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error?.message, variant: 'destructive' });
    } finally {
      setStatusBusy(false);
    }
  };

  const handlePriority = async (priority: TicketPriority) => {
    setPriorityBusy(true);
    try {
      await updatePriority.mutateAsync({ ticketId: ticket.id, priority });
      toast({ title: 'Priority updated', description: `Priority is now ${priority}.` });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error?.message, variant: 'destructive' });
    } finally {
      setPriorityBusy(false);
    }
  };

  const handleAssign = async (staffUserId: string) => {
    setAssignBusy(true);
    try {
      await assign.mutateAsync({
        ticketId: ticket.id,
        staffUserId: staffUserId === 'unassigned' ? null : staffUserId,
      });
      toast({ title: 'Ticket assigned', description: 'Assignment updated.' });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error?.message, variant: 'destructive' });
    } finally {
      setAssignBusy(false);
    }
  };

  if (!canManage) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Ticket Management</h3>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select value={ticket.status} onValueChange={(v) => handleStatus(v as TicketStatus)} disabled={statusBusy}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Priority</label>
        <Select value={ticket.priority} onValueChange={(v) => handlePriority(v as TicketPriority)} disabled={priorityBusy}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKET_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isAdmin && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Assigned Staff</label>
          {assignBusy ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Updating...
            </div>
          ) : (
            <Select
              value={ticket.assigned_staff_id || 'unassigned'}
              onValueChange={handleAssign}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffUsers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.display_name || s.email || 'Staff'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {staffUsers.length === 0 && (
            <p className="text-xs text-muted-foreground">No staff users found. Add a staff role in Supabase.</p>
          )}
        </div>
      )}

      {isStaff && !isAdmin && (
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-full"
          onClick={() => handleAssign('unassigned')}
          disabled={assignBusy || !ticket.assigned_staff_id}
        >
          {assignBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Unassign me
        </Button>
      )}
    </div>
  );
}

