import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2, Snowflake, Wind, Bus, MapPin, User, Check } from 'lucide-react';
import { BusType, BUS_TYPE_CONFIGS } from '@/types/booking';
import ViaPointsEditor from './ViaPointsEditor';

interface RouteFormData {
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
}

interface RouteFormWizardProps {
  initialData?: RouteFormData;
  onSubmit: (data: RouteFormData) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
}

const STEPS = [
  { id: 1, title: 'Route Info', icon: MapPin },
  { id: 2, title: 'Bus Details', icon: Bus },
  { id: 3, title: 'Staff Info', icon: User },
  { id: 4, title: 'Via Points', icon: MapPin },
];

const RouteFormWizard = ({ 
  initialData, 
  onSubmit, 
  isSubmitting, 
  submitLabel = 'Add Route' 
}: RouteFormWizardProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RouteFormData>(initialData || {
    name: '',
    from: '',
    to: '',
    departureTime: '',
    arrivalTime: '',
    price: '',
    busType: 'normal',
    totalSeats: '54',
    busNumber: '',
    driverName: '',
    driverPhone: '',
    conductorName: '',
    conductorPhone: '',
    viaPoints: [],
  });

  const handleNext = () => {
    if (step < STEPS.length) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const handleBusTypeChange = (value: BusType) => {
    const config = BUS_TYPE_CONFIGS[value];
    setFormData({
      ...formData,
      busType: value,
      totalSeats: config.defaultSeats.toString(),
    });
  };

  const isStep1Valid = formData.name && formData.from && formData.to && formData.departureTime && formData.price;

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-center">
        {STEPS.map((s, index) => (
          <div key={s.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                step === s.id ? "text-primary" : step > s.id ? "text-primary/60" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                step === s.id 
                  ? "bg-primary text-primary-foreground scale-110" 
                  : step > s.id 
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}>
                {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s.title}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={cn(
                "w-8 h-0.5 mx-2 transition-all duration-300",
                step > s.id ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content with Animation */}
      <div className="relative min-h-[280px] overflow-hidden">
        {/* Step 1: Route Info */}
        <div className={cn(
          "absolute inset-0 transition-all duration-300 ease-in-out",
          step === 1 ? "translate-x-0 opacity-100" : step > 1 ? "-translate-x-full opacity-0" : "translate-x-full opacity-0"
        )}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="routeName">Route Name</Label>
              <Input
                id="routeName"
                placeholder="e.g., Colombo to Kandy"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  placeholder="Departure city"
                  value={formData.from}
                  onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  placeholder="Destination city"
                  value={formData.to}
                  onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departureTime">Departure Time</Label>
                <Input
                  id="departureTime"
                  placeholder="e.g., 08:00 AM"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arrivalTime">Arrival Time (Est.)</Label>
                <Input
                  id="arrivalTime"
                  placeholder="e.g., 11:30 AM"
                  value={formData.arrivalTime}
                  onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (LKR)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g., 850"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Bus Details */}
        <div className={cn(
          "absolute inset-0 transition-all duration-300 ease-in-out",
          step === 2 ? "translate-x-0 opacity-100" : step > 2 ? "-translate-x-full opacity-0" : "translate-x-full opacity-0"
        )}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="busType">Bus Type / බස් වර්ගය</Label>
              <Select value={formData.busType} onValueChange={handleBusTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bus type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rosa">
                    <div className="flex items-center gap-2">
                      <Snowflake className="w-4 h-4 text-purple-500" />
                      <span>Rosa / Coaster (රෝසා)</span>
                      <span className="text-muted-foreground text-xs">26 seats</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="luxury_ac">
                    <div className="flex items-center gap-2">
                      <Snowflake className="w-4 h-4 text-sky-500" />
                      <span>Luxury A/C (ලක්ෂරි ඒසී)</span>
                      <span className="text-muted-foreground text-xs">45 seats</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="super_long">
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-indigo-500" />
                      <span>Super Long (සුපර් ලෝන්ග්)</span>
                      <span className="text-muted-foreground text-xs">54 seats</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="normal">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-orange-500" />
                      <span>Normal Bus (සාමාන්‍ය බස්)</span>
                      <span className="text-muted-foreground text-xs">54 seats</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalSeats">Total Seats</Label>
              <Input
                id="totalSeats"
                type="number"
                placeholder="e.g., 40"
                value={formData.totalSeats}
                onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="busNumber">Bus Number / Plate (Optional)</Label>
              <Input
                id="busNumber"
                placeholder="e.g., NC-1234"
                value={formData.busNumber}
                onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Step 3: Staff Info */}
        <div className={cn(
          "absolute inset-0 transition-all duration-300 ease-in-out",
          step === 3 ? "translate-x-0 opacity-100" : step > 3 ? "-translate-x-full opacity-0" : "translate-x-full opacity-0"
        )}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Optional - Add driver and conductor details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  placeholder="Driver name"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverPhone">Driver Phone</Label>
                <Input
                  id="driverPhone"
                  placeholder="07X-XXXXXXX"
                  value={formData.driverPhone}
                  onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="conductorName">Conductor Name</Label>
                <Input
                  id="conductorName"
                  placeholder="Conductor name"
                  value={formData.conductorName}
                  onChange={(e) => setFormData({ ...formData, conductorName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conductorPhone">Conductor Phone</Label>
                <Input
                  id="conductorPhone"
                  placeholder="07X-XXXXXXX"
                  value={formData.conductorPhone}
                  onChange={(e) => setFormData({ ...formData, conductorPhone: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Via Points */}
        <div className={cn(
          "absolute inset-0 transition-all duration-300 ease-in-out overflow-y-auto",
          step === 4 ? "translate-x-0 opacity-100" : step > 4 ? "-translate-x-full opacity-0" : "translate-x-full opacity-0"
        )}>
          <ViaPointsEditor
            viaPoints={formData.viaPoints}
            onChange={(viaPoints) => setFormData({ ...formData, viaPoints })}
            fromCity={formData.from}
            toCity={formData.to}
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={step === 1}
          className={cn(step === 1 && "invisible")}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        
        {step < STEPS.length ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={step === 1 && !isStep1Valid}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !isStep1Valid}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RouteFormWizard;
