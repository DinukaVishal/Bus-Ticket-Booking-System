import { useState, useMemo } from 'react';
import { useDrivers, useDeleteDriver, useUpdateDriverStatus } from '@/hooks/useDrivers';
import { useAuth } from '@/hooks/useAuth';
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
import { Plus, Search, Loader2, Pencil, Trash2, UserRound, Bus, Phone, CreditCard, X, ShieldCheck, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { DriverRow, DriverStatus } from '@/types/crew';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
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

const DriversPage = () => {
  const { data: drivers = [], isLoading } = useDrivers();
  const { data: stats, isLoading: statsLoading } = useCrewDashboardStats();
  const { isAdmin } = useAuth();
  const deleteDriver = useDeleteDriver();
  const updateDriverStatus = useUpdateDriverStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'assigned' | 'on_leave' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverRow | null>(null);
  const [updatingDriverId, setUpdatingDriverId] = useState<string | null>(null);

  const handleQuickStatusChange = async (driver: DriverRow, newStatus: DriverStatus) => {
    if (driver.status === newStatus) return;
    try {
      setUpdatingDriverId(driver.id);
      await updateDriverStatus.mutateAsync({
        id: driver.id,
        status: newStatus,
        source: driver.source,
      });
      toast({
        title: 'Status updated',
        description: `${driver.full_name}'s status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update driver status.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingDriverId(null);
    }
  };

  // Status counts
  const counts = useMemo(() => {
    return {
      all: drivers.length,
      available: drivers.filter((d) => d.status === 'available').length,
      assigned: drivers.filter((d) => d.status === 'assigned' || !!d.assigned_bus).length,
      on_leave: drivers.filter((d) => d.status === 'on_leave').length,
      inactive: drivers.filter((d) => d.status === 'inactive').length,
    };
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    let list = drivers;

    // Filter by status tab
    if (statusFilter !== 'all') {
      if (statusFilter === 'assigned') {
        list = list.filter((d) => d.status === 'assigned' || !!d.assigned_bus);
      } else {
        list = list.filter((d) => d.status === statusFilter);
      }
    }

    // Filter by search
    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;

    return list.filter(
      (d) =>
        d.full_name.toLowerCase().includes(term) ||
        (d.nic && d.nic.toLowerCase().includes(term)) ||
        (d.phone && d.phone.toLowerCase().includes(term)) ||
        (d.license_number && d.license_number.toLowerCase().includes(term)) ||
        (d.assigned_bus && d.assigned_bus.toLowerCase().includes(term)) ||
        (d.bus_number && d.bus_number.toLowerCase().includes(term))
    );
  }, [drivers, searchTerm, statusFilter]);

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
      toast({ title: 'Driver removed', description: 'Driver removed from registered list.' });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to remove driver.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'D';
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join('');
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
                  <UserRound className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold">Fleet Drivers</h2>
                <Badge variant="secondary" className="font-mono text-xs">
                  {drivers.length} registered
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                View, manage, and assign all drivers registered to your buses.
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone, bus..."
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
                Add Driver
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm scrollbar-none">
            {[
              { id: 'all', label: 'All Drivers', count: counts.all },
              { id: 'available', label: 'Available', count: counts.available },
              { id: 'assigned', label: 'Assigned to Bus', count: counts.assigned },
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

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="min-w-[200px]">Driver</TableHead>
                <TableHead className="min-w-[140px]">Contact</TableHead>
                <TableHead className="min-w-[130px]">NIC / ID</TableHead>
                <TableHead className="min-w-[140px]">License</TableHead>
                <TableHead className="min-w-[160px]">Assigned Bus</TableHead>
                <TableHead className="min-w-[120px]">Status</TableHead>
                <TableHead className="text-center w-[110px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading drivers list...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="max-w-sm mx-auto flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <UserRound className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">No drivers found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {searchTerm
                            ? `No drivers matching "${searchTerm}". Try a different search.`
                            : 'No drivers registered in this category.'}
                        </p>
                      </div>
                      {!searchTerm && (
                        <Button size="sm" onClick={handleAdd}>
                          <Plus className="w-4 h-4 mr-1.5" />
                          Add Driver
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver) => {
                  const statusConf = STATUS_CONFIG[driver.status] || STATUS_CONFIG.available;
                  const busDisplay = driver.assigned_bus || driver.bus_number;

                  return (
                    <TableRow key={driver.id} className="transition-colors hover:bg-muted/60 group">
                      {/* Driver Name & Avatar */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center border border-primary/20 shrink-0">
                            {getInitials(driver.full_name)}
                          </div>
                          <div>
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <span>{driver.full_name}</span>
                              {driver.source === 'bus_drivers' && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" title="Fleet registered driver" />
                              )}
                            </div>
                            {driver.email ? (
                              <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {driver.email}
                              </div>
                            ) : (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-primary/70" />
                                Registered Driver
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell>
                        {driver.phone && driver.phone !== 'N/A' ? (
                          <a
                            href={`tel:${driver.phone}`}
                            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors font-mono"
                          >
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            {driver.phone}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No phone</span>
                        )}
                      </TableCell>

                      {/* NIC */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground">
                          <CreditCard className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span>{driver.nic || 'Registered'}</span>
                        </div>
                      </TableCell>

                      {/* License */}
                      <TableCell>
                        <span className="font-mono text-xs px-2 py-1 bg-muted rounded border text-foreground">
                          {driver.license_number || 'DL-VERIFIED'}
                        </span>
                      </TableCell>

                      {/* Assigned Bus */}
                      <TableCell>
                        {busDisplay ? (
                          <Badge
                            variant="outline"
                            className="bg-primary/5 text-primary border-primary/20 font-mono text-xs flex items-center gap-1.5 w-fit"
                          >
                            <Bus className="w-3 h-3" />
                            {busDisplay}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            value={driver.status || 'available'}
                            onValueChange={(newStatus) =>
                              handleQuickStatusChange(driver, newStatus as DriverStatus)
                            }
                            disabled={updatingDriverId === driver.id}
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
                                {updatingDriverId === driver.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                ) : (
                                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusConf.dot)} />
                                )}
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent align="start" className="min-w-[130px]">
                              <SelectItem value="available">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span>Available</span>
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
                        ) : (
                          <div
                            className={cn(
                              'h-7 px-2.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 w-fit',
                              statusConf.bg,
                              statusConf.text,
                              statusConf.border
                            )}
                            title="Only admins can change driver status"
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusConf.dot)} />
                            <span>{statusConf.label}</span>
                            <Lock className="w-3 h-3 ml-0.5 opacity-50" />
                          </div>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-1 opacity-90 group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(driver)}
                            title="Edit Driver"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                title="Delete Driver"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Driver?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove <strong>{driver.full_name}</strong>?
                                  This will remove them from the active driver registry.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(driver.id)}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  Delete Driver
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

      <DriverFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        driver={editingDriver}
      />
    </div>
  );
};

export default DriversPage;
