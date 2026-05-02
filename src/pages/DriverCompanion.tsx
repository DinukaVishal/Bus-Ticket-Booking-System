import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useRoutes } from '@/hooks/useRoutes';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Navigation,
  Radio,
  MapPin,
  Gauge,
  AlertCircle,
  Loader2,
  Bus,
  Power,
  PowerOff,
  ShieldAlert
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils'; // <--- MEKA THAMAI MISS WELA THIBBE!

const DriverCompanion = () => {
  const { user, isLoading: authLoading, isDriver } = useAuthContext();
  const { data: routes = [], isLoading: routesLoading } = useRoutes();
  
  // Save selected route in localStorage so it survives page navigation
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(() => {
    return localStorage.getItem('quickbus_driver_route') || null;
  });

  const {
    isSharing,
    error,
    latitude,
    longitude,
    accuracy,
    startSharing,
    stopSharing,
  } = useDriverLocation(selectedRouteId);

  const [hasGhostSession, setHasGhostSession] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  // Update localStorage when route changes
  useEffect(() => {
    if (selectedRouteId) {
      localStorage.setItem('quickbus_driver_route', selectedRouteId);
    }
  }, [selectedRouteId]);

  // Check Database for active "Ghost" sessions that weren't closed properly
  useEffect(() => {
    const checkGhostSessions = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('bus_locations')
        .select('id')
        .eq('driver_user_id', user.id)
        .eq('is_active', true);

      // If there are active records in DB but local tracking is off
      if (data && data.length > 0 && !isSharing) {
        setHasGhostSession(true);
      } else if (isSharing) {
        setHasGhostSession(false);
      }
    };

    checkGhostSessions();
  }, [user, isSharing]);

  // Force clear all active tracking sessions in the Database
  const forceClearSessions = async () => {
    if (!user) return;
    setIsClearing(true);
    try {
      if (isSharing && stopSharing) {
        stopSharing();
      }

      await supabase
        .from('bus_locations')
        .update({ is_active: false })
        .eq('driver_user_id', user.id)
        .eq('is_active', true);

      setHasGhostSession(false);
      toast({
        title: "Session Cleared",
        description: "All background location sessions have been fully stopped.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to clear background sessions.",
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleStartSharing = async () => {
    if (hasGhostSession) {
      await forceClearSessions(); // Clean up DB before starting new
    }
    startSharing();
  };

  const handleStopSharing = async () => {
    if (stopSharing) stopSharing();
    await forceClearSessions(); // Force DB update just to be safe
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is a driver, redirect to dashboard
  if (isDriver) {
    return <Navigate to="/driver/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 shadow-inner">
            <Navigation className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            Driver Companion
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ඔබගේ GPS location share කරන්න passengers ට track කරන්න
          </p>
        </div>

        {/* Ghost Session Warning */}
        {hasGhostSession && !isSharing && (
          <Card className="mb-6 border-amber-500/50 bg-amber-500/10 shadow-md animate-pulse-slow">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <ShieldAlert className="w-10 h-10 text-amber-500" />
                <div>
                  <h3 className="font-bold text-amber-700 dark:text-amber-400">Background Session Detected</h3>
                  <p className="text-xs font-medium text-amber-600/90 dark:text-amber-500/90 mt-1">
                    ඔබ කලින් share කරපු location session එකක් තවමත් background එකේ run වෙනවා වගේ පේනවා. කරුණාකර එය නවත්වන්න.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={forceClearSessions}
                  disabled={isClearing}
                  className="w-full mt-2 shadow-sm"
                >
                  {isClearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PowerOff className="w-4 h-4 mr-2" />}
                  Stop Background Sharing
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Route Selection */}
        <Card className="mb-6 shadow-md border-2">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <Bus className="w-4 h-4 text-primary" />
              Route තෝරන්න
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <Select
              value={selectedRouteId || ''}
              onValueChange={(v) => setSelectedRouteId(v)}
              disabled={isSharing}
            >
              <SelectTrigger className="border-2 h-12">
                <SelectValue placeholder="Route එකක් select කරන්න..." />
              </SelectTrigger>
              <SelectContent>
                {routesLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      <span className="font-semibold">{route.name}</span> <span className="text-muted-foreground text-xs ml-1">({route.from} → {route.to})</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedRoute && (
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm space-y-1.5 shadow-inner">
                <p className="font-extrabold text-primary">{selectedRoute.name}</p>
                <p className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {selectedRoute.from} → {selectedRoute.to}
                </p>
                <p className="text-muted-foreground font-medium flex items-center gap-1.5">
                  🕐 {selectedRoute.departureTime}
                  {selectedRoute.busNumber && <span className="ml-1 flex items-center gap-1"> • <Bus className="w-3 h-3"/> {selectedRoute.busNumber}</span>}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GPS Control */}
        <Card className="mb-6 shadow-lg border-2">
          <CardContent className="pt-6 p-6">
            <Button
              onClick={isSharing ? handleStopSharing : handleStartSharing}
              disabled={(!selectedRouteId && !isSharing) || isClearing}
              variant={isSharing ? 'destructive' : 'default'}
              className={cn(
                "w-full h-16 text-lg gap-3 font-bold shadow-md transition-all duration-300",
                isSharing ? "bg-rose-500 hover:bg-rose-600" : "bg-primary hover:bg-primary/90"
              )}
              size="lg"
            >
              {isSharing ? (
                <>
                  <PowerOff className="w-6 h-6" />
                  GPS Sharing නවත්වන්න
                </>
              ) : (
                <>
                  <Power className="w-6 h-6" />
                  GPS Sharing ආරම්භ කරන්න
                </>
              )}
            </Button>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Status */}
        {isSharing && (
          <Card className="border-2 border-emerald-500/50 bg-emerald-50 shadow-md">
            <CardHeader className="pb-3 bg-emerald-500/10 border-b border-emerald-500/20">
              <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
                <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
                Live Sharing Active
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-white border shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    Latitude
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground">
                    {latitude?.toFixed(6) || '—'}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white border shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    Longitude
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground">
                    {longitude?.toFixed(6) || '—'}
                  </p>
                </div>
              </div>

              {accuracy && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <Gauge className="w-4 h-4" />
                  <span>Accuracy: ±{Math.round(accuracy)} meters</span>
                </div>
              )}

              <Badge variant="secondary" className="w-full justify-center py-2 text-emerald-700 bg-emerald-100 hover:bg-emerald-100 border border-emerald-200">
                📡 Passengers can now see your live location
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        {!isSharing && (
          <div className="text-center text-sm text-muted-foreground space-y-2 mt-8 bg-muted/30 p-4 rounded-xl border">
            <p className="font-medium">GPS sharing enable කරාම passengers ට ඔබගේ bus එක real-time track කරන්න පුළුවන්.</p>
            <p className="text-xs">Location data ඔබ sharing stop කරාම automatically remove වෙනවා.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverCompanion;