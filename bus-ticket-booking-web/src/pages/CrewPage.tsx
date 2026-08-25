import { useState, useMemo } from 'react';
import { useCrewMembers, useDeleteCrewMember, useUpdateCrewStatus } from '@/hooks/useCrewMembers';
import { useCrewDashboardStats } from '@/hooks/useCrewDashboardStats';
import CrewStatCards from '@/components/crew/CrewStatCards';
import CrewFormDialog from '@/components/crew/CrewFormDialog';
import AttendanceDialog from '@/components/crew/AttendanceDialog';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Search, Loader2, Pencil, Trash2, CalendarCheck, Users, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CrewMemberRow, CrewStatus } from '@/types/crew';

const ROLE_COLORS: Record<string, string> = {
  conductor: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  inspector: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800',
  assistant: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  active: {
    label: 'Active',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  available: {
    label: 'Available',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  assigned: {
    label: 'Assigned',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  on_leave: {
    label: 'On Leave',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  inactive: {
    label: 'Inactive',
    bg: 'bg-zinc-100 dark:bg-zinc-900/60',
    text: 'text-zinc-600 dark:text-zinc-400',
    border: 'border-zinc-200 dark:border-zinc-800',
    dot: 'bg-zinc-400',
  },
};

const CrewPage = () => {
  const { data: crewMembers = [], isLoading } = useCrewMembers();
  const { data: stats, isLoading: statsLoading } = useCrewDashboardStats();
  const deleteCrew = useDeleteCrewMember();
  const updateCrewStatus = useUpdateCrewStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'available' | 'assigned' | 'on_leave' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<CrewMemberRow | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceCrewId, setAttendanceCrewId] = useState<string | null>(null);
  const [updatingCrewId, setUpdatingCrewId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      all: crewMembers.length,
      active: crewMembers.filter((c) => c.status === 'active' || c.status === 'available').length,
      available: crewMembers.filter((c) => c.status === 'available').length,
      assigned: crewMembers.filter((c) => c.status === 'assigned' || !!c.assigned_bus).length,
      on_leave: crewMembers.filter((c) => c.status === 'on_leave').length,
      inactive: crewMembers.filter((c) => c.status === 'inactive').length,
    };
  }, [crewMembers]);

  const filteredCrew = useMemo(() => {
    let list = crewMembers;

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        list = list.filter((c) => c.status === 'active' || c.status === 'available');
      } else if (statusFilter === 'assigned') {
        list = list.filter((c) => c.status === 'assigned' || !!c.assigned_bus);
      } else {
        list = list.filter((c) => c.status === statusFilter);
      }
    }

    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (c) =>
        c.full_name.toLowerCase().includes(term) ||
        (c.nic && c.nic.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.crew_role && c.crew_role.toLowerCase().includes(term))
    );
  }, [crewMembers, searchTerm, statusFilter]);

  const handleAdd = () => {
    setEditingCrew(null);
    setDialogOpen(true);
  };

  const handleEdit = (crew: CrewMemberRow) => {
    setEditingCrew(crew);
    setDialogOpen(true);
  };

  const handleAttendance = (crew: CrewMemberRow) => {
    setAttendanceCrewId(crew.id);
    setAttendanceOpen(true);
  };

  const handleQuickStatusChange = async (crew: CrewMemberRow, newStatus: CrewStatus) => {
    if (crew.status === newStatus) return;
    try {
      setUpdatingCrewId(crew.id);
      await updateCrewStatus.mutateAsync({
        id: crew.id,
        status: newStatus,
        source: crew.source,
      });
      toast({
        title: 'Status updated',
        description: `${crew.full_name}'s status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update crew status.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingCrewId(null);
    }
  };

  const handleDelete = async (crewId: string) => {
    try {
      await deleteCrew.mutateAsync(crewId);
      toast({ title: 'Crew deleted', description: 'Crew member removed successfully.' });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete crew member.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <CrewStatCards stats={stats} loading={statsLoading} />

      <div className="floating-window hover-card overflow-hidden border">
        {/* Header & Controls */}
        <div className="p-6 border-b space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold">Crew Members</h2>
                <Badge variant="secondary" className="font-mono text-xs">
                  {crewMembers.length} registered
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Manage conductors, inspectors and assistants.
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, NIC, role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-8"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button onClick={handleAdd} className="shadow-sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Crew
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm scrollbar-none">
            {[
              { id: 'all', label: 'All Crew', count: counts.all },
              { id: 'active', label: 'Active', count: counts.active },
              { id: 'assigned', label: 'Assigned', count: counts.assigned },
              { id: 'on_leave', label: 'On Leave', count: counts.on_leave },
              { id: 'inactive', label: 'Inactive', count: counts.inactive },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5',
                  statusFilter === tab.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px]',
                    statusFilter === tab.id
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="min-w-[180px]">Name</TableHead>
                <TableHead className="min-w-[130px]">NIC</TableHead>
                <TableHead className="min-w-[130px]">Phone</TableHead>
                <TableHead className="min-w-[120px]">Role</TableHead>
                <TableHead className="min-w-[120px]">Status</TableHead>
                <TableHead className="text-center w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading crew list...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCrew.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="max-w-sm mx-auto flex flex-col items-center justify-center text-center space-y-3">
                      <p className="text-muted-foreground">No crew members found.</p>
                      {!searchTerm && (
                        <Button size="sm" onClick={handleAdd}>
                          <Plus className="w-4 h-4 mr-1.5" />
                          Add Crew
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCrew.map((crew) => {
                  const statusConf = STATUS_CONFIG[crew.status] || STATUS_CONFIG.active;
                  const busDisplay = crew.assigned_bus || crew.bus_number;

                  return (
                  <TableRow key={crew.id} className="transition-colors hover:bg-muted/60 group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center border border-primary/20 shrink-0">
                          {crew.full_name ? crew.full_name.split(' ').filter(Boolean).map((p) => p[0]?.toUpperCase()).slice(0, 2).join('') : 'C'}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{crew.full_name}</div>
                          {busDisplay && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              {busDisplay}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {crew.nic}
                    </TableCell>
                    <TableCell className="text-sm">
                      {crew.phone && crew.phone !== 'N/A' ? (
                        <a href={`tel:${crew.phone}`} className="hover:text-primary transition-colors">
                          {crew.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_COLORS[crew.crew_role] || ''}>
                        {crew.crew_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={crew.status || 'active'}
                        onValueChange={(newStatus) =>
                          handleQuickStatusChange(crew, newStatus as CrewStatus)
                        }
                        disabled={updatingCrewId === crew.id}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-7 px-2.5 rounded-full text-xs font-semibold border transition-all w-[130px] shadow-none focus:ring-1',
                            statusConf.bg,
                            statusConf.text,
                            statusConf.border
                          )}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {updatingCrewId === crew.id ? (
                              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                            ) : (
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusConf.dot)} />
                            )}
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent align="start" className="min-w-[130px]">
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>Active</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="assigned">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>Assigned</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="on_leave">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span>On Leave</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-zinc-400" />
                              <span>Inactive</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center items-center gap-1 opacity-90 group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleAttendance(crew)}
                          title="Mark attendance"
                        >
                          <CalendarCheck className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(crew)}
                          title="Edit Crew"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete Crew"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Crew Member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove <strong>{crew.full_name}</strong>. Assignments referencing this crew member will keep their history but unlink the crew.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(crew.id)}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CrewFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        crew={editingCrew}
      />

      <AttendanceDialog
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        crewId={attendanceCrewId}
      />
    </div>
  );
};

export default CrewPage;


