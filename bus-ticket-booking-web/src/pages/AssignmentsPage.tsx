import { useState, useMemo } from 'react';
import { useBusAssignments, useEndBusAssignment, useDeleteBusAssignment } from '@/hooks/useBusAssignments';
import AssignmentFormDialog from '@/components/crew/AssignmentFormDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Loader2, CheckCircle2, XCircle, Trash2, GitBranch } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { BusAssignmentRow } from '@/types/crew';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const AssignmentsPage = () => {
  const { data: assignments = [], isLoading } = useBusAssignments();
  const endAssignment = useEndBusAssignment();
  const deleteAssignment = useDeleteBusAssignment();

  const [dialogOpen, setDialogOpen] = useState(false);

  const activeCount = useMemo(
    () => assignments.filter((a) => a.status === 'active').length,
    [assignments]
  );

  const handleEnd = async (assignment: BusAssignmentRow, status: 'completed' | 'cancelled') => {
    try {
      await endAssignment.mutateAsync({ assignmentId: assignment.id, status });
      toast({ title: 'Assignment ended', description: `Assignment marked ${status}.` });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to end assignment.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (assignmentId: string) => {
    try {
      await deleteAssignment.mutateAsync(assignmentId);
      toast({ title: 'Assignment deleted', description: 'Assignment removed successfully.' });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete assignment.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="floating-window hover-card overflow-hidden border">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              Bus Assignments
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {activeCount} active assignment{activeCount !== 1 ? 's' : ''} • Assign drivers and crew to buses, routes and schedules.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Assignment
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Bus</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Crew</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <p className="text-muted-foreground">No assignments found. Create one to get started.</p>
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((a) => (
                  <TableRow key={a.id} className="transition-colors hover:bg-muted/70">
                    <TableCell>
                      <div className="font-mono font-semibold">
                        {a.owner_buses?.bus_number || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {(a.owner_buses?.bus_type || '').replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.routes?.name || '—'}
                      {a.routes && (
                        <div className="text-xs text-muted-foreground">
                          {a.routes.from_city} → {a.routes.to_city}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.trips?.departure_time
                        ? `${a.trips.departure_time} • LKR ${a.trips.price}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {a.drivers ? (
                        <div>
                          <div className="font-medium text-sm">{a.drivers.full_name}</div>
                          <div className="text-xs text-muted-foreground">{a.drivers.phone}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.crew_members ? (
                        <div>
                          <div className="font-medium text-sm">{a.crew_members.full_name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {a.crew_members.crew_role}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{a.assigned_date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[a.status] || ''}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        {a.status === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleEnd(a, 'completed')}
                              title="Mark completed"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-orange-500 hover:bg-orange-50"
                              onClick={() => handleEnd(a, 'cancelled')}
                              title="Cancel assignment"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Assignment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this assignment. The driver will be freed back to available status.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(a.id)}
                                className="bg-red-500 text-white"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AssignmentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default AssignmentsPage;

