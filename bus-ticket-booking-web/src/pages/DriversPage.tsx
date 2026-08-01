import { useState, useMemo } from 'react';
import { useDrivers, useDeleteDriver } from '@/hooks/useDrivers';
import { useCrewDashboardStats } from '@/hooks/useCrewDashboardStats';
import CrewStatCards from '@/components/crew/CrewStatCards';
import DriverFormDialog from '@/components/crew/DriverFormDialog';
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
import { Plus, Search, Loader2, Pencil, Trash2, UserRound } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { DriverRow } from '@/types/crew';

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  on_leave: 'bg-amber-100 text-amber-700 border-amber-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
};

const DriversPage = () => {
  const { data: drivers = [], isLoading } = useDrivers();
  const { data: stats, isLoading: statsLoading } = useCrewDashboardStats();
  const deleteDriver = useDeleteDriver();

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverRow | null>(null);

  const filteredDrivers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return drivers;
    return drivers.filter(
      (d) =>
        d.full_name.toLowerCase().includes(term) ||
        d.nic.toLowerCase().includes(term) ||
        d.phone.toLowerCase().includes(term) ||
        (d.license_number || '').toLowerCase().includes(term)
    );
  }, [drivers, searchTerm]);

  const handleAdd = () => {
    setEditingDriver(null);
    setDialogOpen(true);
  };

  const handleEdit = (driver: DriverRow) => {
    setEditingDriver(driver);
    setDialogOpen(true);
  };

  const handleDelete = async (driverId: string) => {
    try {
      await deleteDriver.mutateAsync(driverId);
      toast({ title: 'Driver deleted', description: 'Driver removed successfully.' });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete driver.',
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
              <UserRound className="w-5 h-5 text-primary" />
              Drivers
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage drivers registered to your fleet.
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, NIC, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
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
                <TableHead>License</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <p className="text-muted-foreground">No drivers found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver) => (
                  <TableRow key={driver.id} className="transition-colors hover:bg-muted/70">
                    <TableCell className="font-medium">{driver.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{driver.nic}</TableCell>
                    <TableCell className="text-sm">{driver.phone}</TableCell>
                    <TableCell className="text-sm">{driver.license_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[driver.status] || ''}>
                        {driver.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(driver)}>
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
                              <AlertDialogTitle>Delete Driver?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove <strong>{driver.full_name}</strong>. Assignments referencing this driver will keep their history but unlink the driver.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(driver.id)}
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

      <DriverFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        driver={editingDriver}
      />
    </div>
  );
};

export default DriversPage;

