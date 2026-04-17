import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Route, BusType, BUS_TYPE_CONFIGS } from '@/types/booking';
import { useUpdateRoute, useDeleteRoute } from '@/hooks/useRoutes';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, Loader2, Snowflake, Wind, MapPin } from 'lucide-react';
import RouteFormWizard from './RouteFormWizard';

interface RouteCardProps {
  route: Route;
}

const RouteCard = ({ route }: RouteCardProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const updateMutation = useUpdateRoute();
  const deleteMutation = useDeleteRoute();

  const handleUpdate = async (data: {
    name: string;
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
    price: string;
    busType: BusType;
    totalSeats: string;
    busNumber: string;
    driverName: string;
    driverPhone: string;
    conductorName: string;
    conductorPhone: string;
    viaPoints: string[];
  }) => {
    try {
      await updateMutation.mutateAsync({
        id: route.id,
        name: data.name,
        from: data.from,
        to: data.to,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime || undefined,
        price: parseInt(data.price),
        busType: data.busType,
        totalSeats: parseInt(data.totalSeats),
        busNumber: data.busNumber || undefined,
        driverName: data.driverName || undefined,
        driverPhone: data.driverPhone || undefined,
        conductorName: data.conductorName || undefined,
        conductorPhone: data.conductorPhone || undefined,
        viaPoints: data.viaPoints,
      });

      toast({
        title: 'Route Updated',
        description: `${data.name} has been updated successfully.`,
      });

      setIsEditOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update route.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(route.id);
      toast({
        title: 'Route Deleted',
        description: `${route.name} has been deleted.`,
      });
      setIsDeleteOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete route.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const getBusTypeBadgeStyle = (type: BusType) => {
    switch (type) {
      case 'rosa':
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case 'luxury_ac':
        return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
      case 'super_long':
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
      default:
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
    }
  };

  const getBusTypeLabel = (type: BusType) => {
    const config = BUS_TYPE_CONFIGS[type];
    return config ? config.name : 'Normal';
  };

  return (
    <>
      <div className="bg-muted/50 rounded-lg p-4 hover:bg-muted transition-colors group">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">{route.name}</h4>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1",
              getBusTypeBadgeStyle(route.busType)
            )}>
              {BUS_TYPE_CONFIGS[route.busType]?.isAC ? (
                <Snowflake className="w-3 h-3" />
              ) : (
                <Wind className="w-3 h-3" />
              )}
              {getBusTypeLabel(route.busType)}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsEditOpen(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>📍 {route.from} → {route.to}</span>
          <span>🕐 {route.departureTime}</span>
          <span>💺 {route.totalSeats} seats</span>
          <span className="text-primary font-medium">LKR {route.price.toLocaleString()}</span>
          {route.viaPoints && route.viaPoints.length > 0 && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {route.viaPoints.length} stops
            </span>
          )}
        </div>
      </div>

      {/* Edit Dialog - Now uses the same Wizard form */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
          </DialogHeader>
          <RouteFormWizard
            initialData={{
              name: route.name,
              from: route.from,
              to: route.to,
              departureTime: route.departureTime,
              arrivalTime: route.arrivalTime || '',
              price: route.price.toString(),
              busType: route.busType,
              totalSeats: route.totalSeats.toString(),
              busNumber: route.busNumber || '',
              driverName: route.driverName || '',
              driverPhone: route.driverPhone || '',
              conductorName: route.conductorName || '',
              conductorPhone: route.conductorPhone || '',
              viaPoints: route.viaPoints || [],
            }}
            onSubmit={handleUpdate}
            isSubmitting={updateMutation.isPending}
            submitLabel="Update Route"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Route?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{route.name}"? This will also delete all associated bookings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RouteCard;
