import { useState, useMemo } from 'react';
import { useCrewMembers, useDeleteCrewMember } from '@/hooks/useCrewMembers';
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
import { Plus, Search, Loader2, Pencil, Trash2, CalendarCheck, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { CrewMemberRow } from '@/types/crew';

const ROLE_COLORS: Record<string, string> = {
  conductor: 'bg-blue-100 text-blue-700 border-blue-200',
  inspector: 'bg-violet-100 text-violet-700 border-violet-200',
  assistant: 'bg-amber-100 text-amber-700 border-amber-200',
};

const CrewPage = () => {
  const { data: crewMembers = [], isLoading } = useCrewMembers();
  const { data: stats, isLoading: statsLoading } = useCrewDashboardStats();
  const deleteCrew = useDeleteCrewMember();

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<CrewMemberRow | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceCrewId, setAttendanceCrewId] = useState<string | null>(null);

  const filteredCrew = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return crewMembers;
    return crewMembers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(term) ||
        c.nic.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        c.crew_role.toLowerCase().includes(term)
    );
  }, [crewMembers, searchTerm]);

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
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Crew Members
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage conductors, inspectors and assistants.
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, NIC, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Crew
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>NIC</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredCrew.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <p className="text-muted-foreground">No crew members found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCrew.map((crew) => (
                  <TableRow key={crew.id} className="transition-colors hover:bg-muted/70">
                    <TableCell className="font-medium">{crew.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{crew.nic}</TableCell>
                    <TableCell className="text-sm">{crew.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_COLORS[crew.crew_role] || ''}>
                        {crew.crew_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={crew.status === 'active' ? 'default' : 'secondary'}>
                        {crew.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleAttendance(crew)} title="Mark attendance">
                          <CalendarCheck className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(crew)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50">
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
                ))
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

