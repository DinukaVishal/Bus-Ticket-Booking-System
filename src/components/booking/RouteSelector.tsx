import { useState } from 'react';
import { Route, BUS_TYPE_CONFIGS } from '@/types/booking';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Clock, Banknote, Snowflake, Wind, Armchair, Bus, User, Phone, Timer, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RouteSelectorProps {
  routes: Route[];
  selectedRoute: Route | null;
  onRouteSelect: (route: Route) => void;
}

const RouteSelector = ({ routes, selectedRoute, onRouteSelect }: RouteSelectorProps) => {
  const [showStops, setShowStops] = useState(false);

  const handleRouteChange = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (route) {
      onRouteSelect(route);
      setShowStops(false); 
    }
  };

  const getBusTypeBadgeStyle = (busType: string) => {
    switch (busType) {
      case 'rosa':
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200";
      case 'luxury_ac':
        return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200";
      case 'super_long':
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200";
      default:
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200";
    }
  };

  const getBusTypeIcon = (busType: string) => {
    const config = BUS_TYPE_CONFIGS[busType as keyof typeof BUS_TYPE_CONFIGS];
    if (config?.isAC) {
      return <Snowflake className="w-4 h-4 transition-transform duration-500 group-hover:rotate-180" />;
    }
    return <Wind className="w-4 h-4 transition-transform duration-500 group-hover:scale-110" />;
  };

  const getBusTypeName = (busType: string) => {
    const config = BUS_TYPE_CONFIGS[busType as keyof typeof BUS_TYPE_CONFIGS];
    return config ? config.name : 'Normal';
  };

  const hasVehicleDetails = (route: Route) => {
    return !!(route.busNumber || route.driverName || route.conductorName);
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-foreground ml-1">Select Route</label>
      <Select value={selectedRoute?.id || ''} onValueChange={handleRouteChange}>
        <SelectTrigger className="w-full h-12 bg-card border-2 transition-all duration-300 hover:border-primary/60 hover:shadow-md focus:ring-2 focus:ring-primary/20 group">
          <SelectValue placeholder="Choose your route" />
        </SelectTrigger>
        <SelectContent className="animate-in fade-in zoom-in-95 duration-200">
          {routes.map((route) => (
            <SelectItem key={route.id} value={route.id} className="py-3 cursor-pointer transition-colors hover:bg-primary/5">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">{route.name}</span>
                <span className={cn(
                  "ml-2 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 border",
                  getBusTypeBadgeStyle(route.busType)
                )}>
                  {getBusTypeIcon(route.busType)}
                  {getBusTypeName(route.busType)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedRoute && (
        <div className="bg-background border-2 rounded-xl shadow-sm hover:shadow-lg transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 flex flex-col max-h-[400px] overflow-hidden group">
          
          {/* Header Section (Fixed at top with Gradient) */}
          <div className="bg-gradient-to-r from-muted/50 to-muted/10 p-4 border-b-2 flex justify-between items-start gap-4 sticky top-0 z-10 shrink-0 backdrop-blur-sm">
            <div>
              <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                {selectedRoute.from} 
                <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" /> 
                {selectedRoute.to}
              </h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-md border shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <Armchair className="w-3.5 h-3.5 text-amber-500" />
                  {selectedRoute.totalSeats} Total Seats
                </span>
              </div>
            </div>
            <div className={cn(
              "flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border-2 shadow-inner transition-transform duration-500 hover:scale-105 group/badge",
              getBusTypeBadgeStyle(selectedRoute.busType)
            )}>
              <div className="group-hover/badge:animate-pulse">
                {getBusTypeIcon(selectedRoute.busType)}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">
                {getBusTypeName(selectedRoute.busType)}
              </span>
            </div>
          </div>

          {/* SCROLL WENA BODY EKA */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            
            {/* Grid Information with Hover effects */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="space-y-1 p-3 bg-muted/10 rounded-xl border border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-background group/time">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-500 transition-transform duration-500 group-hover/time:rotate-12" /> Departure
                </div>
                <div className="font-bold text-base text-foreground">{selectedRoute.departureTime}</div>
              </div>
              
              {selectedRoute.arrivalTime ? (
                <div className="space-y-1 p-3 bg-muted/10 rounded-xl border border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-background group/time">
                  <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-rose-500 transition-transform duration-500 group-hover/time:-rotate-12" /> Arrival (Est.)
                  </div>
                  <div className="font-bold text-base text-foreground">{selectedRoute.arrivalTime}</div>
                </div>
              ) : (
                <div className="space-y-1 p-3 bg-muted/10 rounded-xl border border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-background">
                  <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-muted-foreground/60" /> Arrival
                  </div>
                  <div className="font-bold text-base text-muted-foreground/70">TBA</div>
                </div>
              )}

              {/* Price Box with subtle scaling */}
              <div className="col-span-2 bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-xl flex justify-between items-center border border-primary/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:from-primary/15">
                <div className="text-sm font-semibold flex items-center gap-2.5">
                  <Banknote className="w-5 h-5 text-primary" /> Ticket Price
                </div>
                <div className="font-black text-xl text-primary drop-shadow-sm">
                  LKR {selectedRoute.price.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Collapsible Via Points */}
            {selectedRoute.viaPoints && selectedRoute.viaPoints.length > 0 && (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground h-10 px-4 rounded-lg border-2 transition-all duration-300 hover:border-amber-500/30 hover:bg-amber-500/5 group/btn"
                  onClick={() => setShowStops(!showStops)}
                >
                  <span className="flex items-center gap-2 font-semibold text-xs">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 transition-transform duration-300 group-hover/btn:scale-110" /> 
                    Route Stops ({selectedRoute.viaPoints.length})
                  </span>
                  {showStops ? (
                    <ChevronUp className="w-4 h-4 transition-transform duration-300" />
                  ) : (
                    <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                  )}
                </Button>
                
                <div className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  showStops ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
                )}>
                  <div className="overflow-hidden">
                    <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-bold shadow-sm animate-in zoom-in duration-300">{selectedRoute.from}</span>
                        {selectedRoute.viaPoints.map((point, index) => (
                          <span key={index} className="flex items-center gap-1.5 animate-in slide-in-from-left-2 fade-in" style={{ animationDelay: `${(index + 1) * 75}ms`, animationFillMode: 'both' }}>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="bg-amber-100/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-1 rounded-full font-semibold border border-amber-200/50 shadow-sm transition-colors hover:bg-amber-200/80 cursor-default">{point}</span>
                          </span>
                        ))}
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="bg-destructive text-destructive-foreground px-2.5 py-1 rounded-full font-bold shadow-sm animate-in zoom-in duration-300" style={{ animationDelay: `${(selectedRoute.viaPoints.length + 1) * 75}ms`, animationFillMode: 'both' }}>{selectedRoute.to}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Details */}
            {hasVehicleDetails(selectedRoute) && (
              <div className="bg-muted/20 border-2 p-3.5 text-[11px] flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl mt-4">
                {selectedRoute.busNumber && (
                  <span className="flex items-center gap-1.5 text-foreground font-bold bg-background px-3 py-1.5 rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30">
                    <Bus className="w-3.5 h-3.5 text-primary" />
                    {selectedRoute.busNumber}
                  </span>
                )}
                {selectedRoute.driverName && (
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium bg-background px-3 py-1.5 rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    Dr: <span className="text-foreground font-semibold">{selectedRoute.driverName}</span>
                    {selectedRoute.driverPhone && (
                      <a href={`tel:${selectedRoute.driverPhone}`} className="text-primary hover:text-primary/80 ml-0.5 font-bold transition-colors">
                        <Phone className="w-3 h-3 inline-block mr-0.5" />
                        {selectedRoute.driverPhone}
                      </a>
                    )}
                  </span>
                )}
                {selectedRoute.conductorName && (
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium bg-background px-3 py-1.5 rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                    <User className="w-3.5 h-3.5 text-amber-500" />
                    Co: <span className="text-foreground font-semibold">{selectedRoute.conductorName}</span>
                    {selectedRoute.conductorPhone && (
                      <a href={`tel:${selectedRoute.conductorPhone}`} className="text-primary hover:text-primary/80 ml-0.5 font-bold transition-colors">
                        <Phone className="w-3 h-3 inline-block mr-0.5" />
                        {selectedRoute.conductorPhone}
                      </a>
                    )}
                  </span>
                )}
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteSelector;