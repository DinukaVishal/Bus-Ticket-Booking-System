import { useState } from 'react';
import { Route, Trip, BUS_TYPE_CONFIGS } from '@/types/booking';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MapPin, Clock, Banknote, Snowflake, Wind, Armchair, Bus, User, Phone, Timer, ChevronDown, ChevronUp, ArrowRight, Check, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RouteSelectorProps {
  routes: Route[];
  selectedRoute: Route | null;
  selectedTrip: Trip | null;
  onRouteSelect: (route: Route) => void;
  onTripSelect: (trip: Trip) => void;
}

const RouteSelector = ({ routes, selectedRoute, selectedTrip, onRouteSelect, onTripSelect }: RouteSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [showStops, setShowStops] = useState(false);

  const handleRouteChange = (route: Route) => {
    onRouteSelect(route);
    setOpen(false);
    setShowStops(false);
  };

  const handleTripChange = (trip: Trip) => {
    onTripSelect(trip);
    setTripOpen(false);
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-12 bg-card border-2 transition-all duration-300 hover:border-primary/60 hover:shadow-md focus:ring-2 focus:ring-primary/20 justify-between"
          >
            {selectedRoute ? (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">{selectedRoute.name}</span>
                <span className={cn(
                  "ml-2 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 border",
                  getBusTypeBadgeStyle(selectedRoute.busType)
                )}>
                  {getBusTypeIcon(selectedRoute.busType)}
                  {getBusTypeName(selectedRoute.busType)}
                </span>
              </div>
            ) : (
              "Choose your route"
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search routes..." />
            <CommandList>
              <CommandEmpty>No routes found.</CommandEmpty>
              <CommandGroup>
                {routes.map((route) => (
                  <CommandItem
                    key={route.id}
                    value={`${route.name} ${route.from} ${route.to}`}
                    onSelect={() => handleRouteChange(route)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedRoute?.id === route.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <MapPin className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="font-medium">{route.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {route.from} → {route.to}
                        </span>
                      </div>
                      <span className={cn(
                        "ml-auto px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 border",
                        getBusTypeBadgeStyle(route.busType)
                      )}>
                        {getBusTypeIcon(route.busType)}
                        {getBusTypeName(route.busType)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Trip Selection */}
      {selectedRoute && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground ml-1">Select Travel Time</label>
          <Popover open={tripOpen} onOpenChange={setTripOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={tripOpen}
                className="w-full h-12 bg-card border-2 transition-all duration-300 hover:border-primary/60 hover:shadow-md focus:ring-2 focus:ring-primary/20 justify-between"
                disabled={selectedRoute.trips.length === 0}
              >
                {selectedTrip ? (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{selectedTrip.departureTime}</span>
                      {selectedTrip.arrivalTime && (
                        <span className="text-xs text-muted-foreground">
                          Arrives: {selectedTrip.arrivalTime}
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      LKR {selectedTrip.price.toLocaleString()}
                    </Badge>
                  </div>
                ) : selectedRoute.trips.length === 0 ? (
                  "No trips available for this route"
                ) : (
                  "Choose travel time"
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search by time..." />
                <CommandList>
                  <CommandEmpty>No trips found.</CommandEmpty>
                  <CommandGroup>
                    {selectedRoute.trips.map((trip) => (
                      <CommandItem
                        key={trip.id}
                        value={`${trip.departureTime} ${trip.arrivalTime || ''}`}
                        onSelect={() => handleTripChange(trip)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTrip?.id === trip.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <Clock className="w-4 h-4 text-primary" />
                          <div className="flex flex-col">
                            <span className="font-medium">{trip.departureTime}</span>
                            {trip.arrivalTime && (
                              <span className="text-sm text-muted-foreground">
                                Arrives: {trip.arrivalTime}
                              </span>
                            )}
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <Badge variant="outline">
                              LKR {trip.price.toLocaleString()}
                            </Badge>
                            {trip.busNumber && (
                              <Badge variant="secondary">
                                {trip.busNumber}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedRoute.trips.length === 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border">
              <p className="font-medium text-amber-600">No trips available</p>
              <p>This route currently has no scheduled trips. Please check back later or contact support.</p>
            </div>
          )}
        </div>
      )}
      {/* Selected Trip Details */}
      {selectedRoute && selectedTrip && (
        <div className="bg-background border-2 rounded-xl shadow-sm hover:shadow-lg transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 flex flex-col max-h-[400px] overflow-hidden group">
          
          {/* Header Section */}
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
                <span className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-md border shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <Bus className="w-3.5 h-3.5 text-blue-500" />
                  {selectedTrip.busNumber || 'Bus TBD'}
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

          {/* Trip Details */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            
            {/* Time Information */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="space-y-1 p-3 bg-muted/10 rounded-xl border border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-background group/time">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-500 transition-transform duration-500 group-hover/time:rotate-12" /> Departure
                </div>
                <div className="font-bold text-base text-foreground">{selectedTrip.departureTime}</div>
                <div className="text-xs text-muted-foreground">{selectedRoute.from}</div>
              </div>
              
              {selectedTrip.arrivalTime ? (
                <div className="space-y-1 p-3 bg-muted/10 rounded-xl border border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-background group/time">
                  <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-rose-500 transition-transform duration-500 group-hover/time:-rotate-12" /> Arrival
                  </div>
                  <div className="font-bold text-base text-foreground">{selectedTrip.arrivalTime}</div>
                  <div className="text-xs text-muted-foreground">{selectedRoute.to}</div>
                </div>
              ) : (
                <div className="space-y-1 p-3 bg-muted/10 rounded-xl border border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-background">
                  <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-muted-foreground/60" /> Arrival
                  </div>
                  <div className="font-bold text-base text-muted-foreground/70">TBA</div>
                  <div className="text-xs text-muted-foreground">{selectedRoute.to}</div>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-xl flex justify-between items-center border border-primary/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:from-primary/15">
              <div className="text-sm font-semibold flex items-center gap-2.5">
                <Banknote className="w-5 h-5 text-primary" /> Ticket Price
              </div>
              <div className="text-xl font-bold text-primary">
                LKR {selectedTrip.price.toLocaleString()}
              </div>
            </div>

            {/* Bus Details */}
            {(selectedTrip.driverName || selectedTrip.conductorName) && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" /> Crew Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedTrip.driverName && (
                    <div className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg border">
                      <User className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">{selectedTrip.driverName}</p>
                        <p className="text-xs text-muted-foreground">Driver</p>
                        {selectedTrip.driverPhone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {selectedTrip.driverPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedTrip.conductorName && (
                    <div className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg border">
                      <User className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">{selectedTrip.conductorName}</p>
                        <p className="text-xs text-muted-foreground">Conductor</p>
                        {selectedTrip.conductorPhone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {selectedTrip.conductorPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteSelector;