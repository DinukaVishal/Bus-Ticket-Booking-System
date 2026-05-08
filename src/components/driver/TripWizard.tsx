import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2, Bus, User, MapPin, Check, Plus, Trash2 } from 'lucide-react';
import { Route, Trip } from '@/types/booking';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TripData {
  id?: string;
  departureTime: string;
  arrivalTime: string;
  price: string;
  busNumber: string;
  stopArrivalTimes: string[];
}

interface TripWizardProps {
  route: Route;
  bus: {
    id: string;
    busNumber?: string;
  };
  existingTrips?: Trip[];
  defaultDriverName?: string;
  defaultConductorName?: string;
  disableStaffFields?: boolean;
  includeBusId?: boolean;
  isOwnerBus?: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const STEPS = [
  { id: 1, title: 'Route', icon: MapPin },
  { id: 2, title: 'Driver Info', icon: User },
  { id: 3, title: 'Trips', icon: Bus },
];

const TripWizard = ({
  route,
  bus,
  existingTrips = [],
  defaultDriverName,
  defaultConductorName,
  disableStaffFields = false,
  includeBusId = true,
  isOwnerBus = false,
  onSubmit,
  onCancel,
  isSubmitting,
}: TripWizardProps) => {
  const [step, setStep] = useState(1);
  const [driverName, setDriverName] = useState(defaultDriverName || existingTrips[0]?.driverName || '');
  const [conductorName, setConductorName] = useState(defaultConductorName || existingTrips[0]?.conductorName || '');
  const [trips, setTrips] = useState<TripData[]>(
    existingTrips.length > 0
      ? existingTrips.map((trip) => ({
          id: trip.id,
          departureTime: trip.departureTime,
          arrivalTime: trip.arrivalTime || '',
          price: trip.price.toString(),
          busNumber: trip.busNumber || bus.busNumber || '',
          stopArrivalTimes: trip.stopArrivalTimes || route.viaPoints?.map(() => '') || [],
        }))
      : [{
          departureTime: '',
          arrivalTime: '',
          price: '',
          busNumber: bus.busNumber || '',
          stopArrivalTimes: route.viaPoints?.map(() => '') || [],
        }]
  );
  const [deletedTripIds, setDeletedTripIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDriverName(defaultDriverName || existingTrips[0]?.driverName || '');
    setConductorName(defaultConductorName || existingTrips[0]?.conductorName || '');
    setTrips(
      existingTrips.length > 0
        ? existingTrips.map((trip) => ({
            id: trip.id,
            departureTime: trip.departureTime,
            arrivalTime: trip.arrivalTime || '',
            price: trip.price.toString(),
            busNumber: trip.busNumber || bus.busNumber || '',
            stopArrivalTimes: trip.stopArrivalTimes || route.viaPoints?.map(() => '') || [],
          }))
        : [createEmptyTrip()]
    );
  }, [existingTrips, bus.busNumber]);

  const handleNext = () => {
    if (step < STEPS.length) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const createEmptyTrip = (): TripData => ({
    departureTime: '',
    arrivalTime: '',
    price: '',
    busNumber: bus.busNumber || '',
    stopArrivalTimes: route.viaPoints?.map(() => '') || [],
  });

  const addTrip = () => {
    setTrips([...trips, createEmptyTrip()]);
  };

  const removeTrip = (index: number) => {
    const tripToRemove = trips[index];
    if (tripToRemove?.id) {
      setDeletedTripIds((current) => [...current, tripToRemove.id!]);
    }
    setTrips(trips.filter((_, i) => i !== index));
  };

  const updateTrip = (index: number, field: keyof TripData, value: string) => {
    const newTrips = [...trips];
    newTrips[index][field] = value;
    setTrips(newTrips);
  };

  const updateStopArrivalTime = (tripIndex: number, stopIndex: number, value: string) => {
    const newTrips = [...trips];
    newTrips[tripIndex].stopArrivalTimes[stopIndex] = value;
    setTrips(newTrips);
  };

  const handleSubmit = async () => {
    if (!driverName || !conductorName || trips.length === 0) return;

    for (const trip of trips) {
      if (!trip.departureTime || !trip.arrivalTime || !trip.price || !trip.busNumber) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all trip details.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      console.log('Starting trip save process...');

      const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      };

      console.log('Saving trips for bus:', bus.id, 'existing trips count:', existingTrips.length);
      console.log('Current trips in form:', trips);

      const updatePromises = trips
        .filter((trip) => trip.id)
        .map((trip) => {
          const updateRow: any = {
            route_id: route.id,
            departure_time: formatTime(trip.departureTime),
            arrival_time: formatTime(trip.arrivalTime),
            price: parseInt(trip.price),
            bus_number: trip.busNumber || bus.busNumber || null,
            driver_name: driverName,
            conductor_name: conductorName,
          };
          if (route.viaPoints?.length && trip.stopArrivalTimes?.some((time) => time)) {
            updateRow.via_stop_arrival_times = trip.stopArrivalTimes;
          }
          if (bus.id && includeBusId !== false) {
            if (isOwnerBus) {
              updateRow.owner_bus_id = bus.id;
            } else {
              updateRow.bus_id = bus.id;
            }
          }
          console.log('Updating existing trip:', trip.id, updateRow);
          return supabase
            .from('trips')
            .update(updateRow)
            .eq('id', trip.id);
        });

      if (updatePromises.length > 0) {
        console.log('Executing', updatePromises.length, 'update operations');
        const updateResults = await Promise.all(updatePromises);
        const updateError = updateResults.find((result) => result.error)?.error;
        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
        console.log('Updates completed successfully');
      }

      const newTripsToInsert = trips.filter((trip) => !trip.id);
      console.log('New trips to insert:', newTripsToInsert.length, newTripsToInsert);

      if (newTripsToInsert.length > 0) {
        const newTripsData = newTripsToInsert.map((trip) => {
          const insertRow: any = {
            route_id: route.id,
            departure_time: formatTime(trip.departureTime),
            arrival_time: formatTime(trip.arrivalTime),
            price: parseInt(trip.price),
            bus_number: trip.busNumber || bus.busNumber || null,
            driver_name: driverName,
            conductor_name: conductorName,
          };
          if (route.viaPoints?.length && trip.stopArrivalTimes?.some((time) => time)) {
            insertRow.via_stop_arrival_times = trip.stopArrivalTimes;
          }
          if (bus.id && includeBusId !== false) {
            if (isOwnerBus) {
              insertRow.owner_bus_id = bus.id;
            } else {
              insertRow.bus_id = bus.id;
            }
          }
          return insertRow;
        });

        console.log('Inserting trips data:', newTripsData);

        const { error: insertError } = await supabase
          .from('trips')
          .insert(newTripsData);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        console.log('Inserts completed successfully');
      }

      if (deletedTripIds.length > 0) {
        console.log('Deleting trips:', deletedTripIds);
        const { error: deleteError } = await supabase
          .from('trips')
          .delete()
          .in('id', deletedTripIds);

        if (deleteError) {
          console.error('Delete error:', deleteError);
          throw deleteError;
        }
        console.log('Deletes completed successfully');
      }

      console.log('All operations completed successfully');
      toast({
        title: existingTrips.length > 0 ? 'Trips Updated Successfully' : 'Trips Added Successfully',
        description: `${trips.length} trip(s) have been saved for this bus.`,
      });

      onSubmit();
    } catch (error: any) {
      console.error('Error saving trips:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      toast({
        title: 'Error Saving Trips',
        description: error.message || 'Failed to save trips. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isStep1Valid = true;
  const isStep2Valid = driverName.trim() && conductorName.trim();
  const isStep3Valid = trips.length > 0
    ? trips.every((t) => t.departureTime && t.arrivalTime && t.price && t.busNumber)
    : existingTrips.length > 0; // Allow saving when editing existing trips

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-center">
        {STEPS.map((s, index) => (
          <div key={s.id} className="flex items-center">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
              step >= s.id ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"
            )}>
              {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
            </div>
            <span className={cn(
              "ml-2 text-sm font-medium transition-colors",
              step >= s.id ? "text-foreground" : "text-muted-foreground"
            )}>
              {s.title}
            </span>
            {index < STEPS.length - 1 && (
              <div className={cn(
                "w-12 h-0.5 mx-4 transition-colors",
                step > s.id ? "bg-primary" : "bg-muted-foreground/30"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border border-muted-foreground/10">
                <h3 className="font-semibold">{route.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {route.from} → {route.to}
                </p>
                <p className="text-sm mt-2">
                  Assigned bus: <strong>{bus.busNumber || 'Unknown'}</strong>
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Enter driver name"
                  disabled={disableStaffFields}
                />
              </div>
              <div>
                <Label htmlFor="conductorName">Conductor Name</Label>
                <Input
                  id="conductorName"
                  value={conductorName}
                  onChange={(e) => setConductorName(e.target.value)}
                  placeholder="Enter conductor name"
                  disabled={disableStaffFields}
                />
              </div>
              {disableStaffFields && (
                <p className="text-xs text-muted-foreground">
                  Existing driver and conductor names are already assigned to this bus.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {existingTrips.length > 0 ? 'Edit Trip Details' : 'Trip Details'}
                </h3>
                {existingTrips.length === 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={addTrip}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Trip
                  </Button>
                )}
              </div>

              {trips.map((trip, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">
                        {existingTrips.length > 0 ? 'Trip Details' : `Trip ${index + 1}`}
                      </CardTitle>
                      {existingTrips.length === 0 && trips.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTrip(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Departure Time</Label>
                        <Input
                          type="time"
                          value={trip.departureTime}
                          onChange={(e) => updateTrip(index, 'departureTime', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Arrival Time</Label>
                        <Input
                          type="time"
                          value={trip.arrivalTime}
                          onChange={(e) => updateTrip(index, 'arrivalTime', e.target.value)}
                        />
                      </div>
                    </div>
                    {route.viaPoints?.length ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Intermediate stop arrival times</p>
                        <div className="grid gap-3">
                          {route.viaPoints.map((stop, stopIndex) => (
                            <div key={stopIndex} className="grid grid-cols-1 gap-1">
                              <Label>{stop}</Label>
                              <Input
                                type="time"
                                value={trip.stopArrivalTimes[stopIndex] || ''}
                                onChange={(e) => updateStopArrivalTime(index, stopIndex, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Price (LKR)</Label>
                        <Input
                          type="number"
                          value={trip.price}
                          onChange={(e) => updateTrip(index, 'price', e.target.value)}
                          placeholder="850"
                        />
                      </div>
                      <div>
                        <Label>Bus Number</Label>
                        <Input
                          value={trip.busNumber}
                          onChange={(e) => updateTrip(index, 'busNumber', e.target.value)}
                          placeholder="KA-3456"
                          disabled={!!bus.busNumber}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting || submitting}
            >
              Cancel
            </Button>
          )}
        </div>

        {step < STEPS.length ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={
              (step === 1 && !isStep1Valid) ||
              (step === 2 && !isStep2Valid)
            }
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || submitting || !isStep3Valid}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {existingTrips.length > 0 ? 'Save Trip' : 'Add Trip'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TripWizard;