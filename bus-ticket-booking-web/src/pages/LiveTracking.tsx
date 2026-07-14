import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Header from '@/components/layout/Header';
import { useRoutes } from '@/hooks/useRoutes';
import { Route } from '@/types/booking';
import { BUS_TYPE_CONFIGS } from '@/types/booking';
import {
  findCityCoordinates,
  SRI_LANKA_CENTER,
  SRI_LANKA_ZOOM,
  CityCoordinate,
} from '@/lib/sriLankaCoordinates';
import { useBusAnimation } from '@/hooks/useBusAnimation';
import { useLiveBusLocations, LiveBusLocation } from '@/hooks/useLiveBusLocations';
import { useAuthContext } from '@/contexts/AuthContext';
import { Radio, Bus, MapPin, Phone, User, Loader2, Search, X, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Haversine distance
const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// --- Individual animated bus on the map ---
interface AnimatedBusProps {
  route: Route;
  mapInstance: L.Map;
  isSelected: boolean;
  onSelect: () => void;
  liveLocation?: LiveBusLocation;
  allowSimulation?: boolean;
  busNumber?: string;
}

const AnimatedBus = ({ route, mapInstance, isSelected, onSelect, liveLocation, allowSimulation = true, busNumber }: AnimatedBusProps) => {
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const routePoints = useMemo(() => {
    const from = findCityCoordinates(route.from);
    const to = findCityCoordinates(route.to);
    if (!from || !to) return [];
    const viaCoords = (route.viaPoints || [])
      .map((n) => findCityCoordinates(n))
      .filter((c): c is CityCoordinate => !!c);
    return [from, ...viaCoords, to];
  }, [route]);

  const simulatedPosition = useBusAnimation({
    routePoints,
    departureTime: route.departureTime,
    busType: route.busType,
    isSimulation: true,
  });

  // Prefer real GPS location over simulation
  const busPosition = liveLocation
    ? { lat: liveLocation.latitude, lng: liveLocation.longitude }
    : allowSimulation ? simulatedPosition : null;
  const isLiveGPS = !!liveLocation;

  // Draw route polyline
  useEffect(() => {
    if (routePoints.length < 2 || !mapInstance.getPane('overlayPane')) return;
    const coords: [number, number][] = routePoints.map((p) => [p.lat, p.lng]);
    polylineRef.current = L.polyline(coords, {
      color: isSelected ? 'hsl(var(--primary))' : '#94a3b8',
      weight: isSelected ? 4 : 2,
      opacity: isSelected ? 0.9 : 0.4,
      dashArray: isSelected ? undefined : '6, 8',
    }).addTo(mapInstance);

    return () => {
      polylineRef.current?.remove();
    };
  }, [routePoints, mapInstance, isSelected]);

  // Animate bus marker
  useEffect(() => {
    if (!busPosition || !mapInstance.getPane('markerPane')) return;

    const color = isLiveGPS ? '#f59e0b' : isSelected ? '#10b981' : '#6366f1';
    const size = isSelected ? 36 : 28;

    const icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:${size + 12}px;height:${size + 12}px;">
        ${isSelected || isLiveGPS ? `<div style="position:absolute;top:50%;left:50%;width:${size + 12}px;height:${size + 12}px;margin:-${(size + 12) / 2}px 0 0 -${(size + 12) / 2}px;background:${color}22;border-radius:50%;animation:leaflet-pulse 1.5s ease-out infinite;"></div>` : ''}
        <div style="position:relative;width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:${isSelected ? 16 : 12}px;">
          ${isLiveGPS ? '📡' : '🚌'}
        </div>
      </div>`,
      iconSize: [size + 12, size + 12],
      iconAnchor: [(size + 12) / 2, (size + 12) / 2],
    });

    if (!markerRef.current) {
      markerRef.current = L.marker([busPosition.lat, busPosition.lng], {
        icon,
        zIndexOffset: isSelected ? 1000 : 100,
      })
        .on('click', onSelect)
        .bindPopup(
          `<div class="text-center font-sans">
            <strong>${route.name}</strong><br/>
            <span class="text-xs">${route.from} → ${route.to}</span><br/>
            ${busNumber ? `<span class="text-xs">Bus: ${busNumber}</span><br/>` : ''}
            <span class="text-xs">🕐 ${route.departureTime}</span>
          </div>`
        )
        .addTo(mapInstance);
    } else {
      markerRef.current.setLatLng([busPosition.lat, busPosition.lng]);
      markerRef.current.setIcon(icon);
    }

    return () => {};
  }, [busPosition, isSelected, mapInstance, onSelect, route]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      polylineRef.current?.remove();
    };
  }, []);

  return null;
};

// Add a small pulse animation for divIcons when needed
const pulseStyle = `
@keyframes leaflet-pulse {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.1); opacity: 0.15; }
  100% { transform: scale(0.9); opacity: 0.6; }
}
`;

const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = pulseStyle;
document.head.appendChild(styleSheet);


// --- Main Page ---
function LiveTracking() {
  const { routeId: paramRouteId, bookingId: paramBookingId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isBusOwner } = useAuthContext();
  const { data: routes = [], isLoading } = useRoutes();
  const liveLocations = useLiveBusLocations();
  const [searchParams] = useSearchParams();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingFilter, setTrackingFilter] = useState<'all' | 'live' | 'simulated'>('all');
  const [selectedStop, setSelectedStop] = useState<string>('all');
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionChecked, setPermissionChecked] = useState<boolean>(false);
  const [bookingDetails, setBookingDetails] = useState<{
    id: string;
    route_id: string;
    date: string;
    status: string;
    trip_id: string;
  } | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewPassengerName, setReviewPassengerName] = useState<string>(user?.user_metadata?.full_name || '');
  const [reviewError, setReviewError] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewPrompted, setReviewPrompted] = useState(false);
  const routeReviewId = searchParams.get('routeId');
  const routeReviewName = searchParams.get('routeName') ?? '';

  // Check permissions for specific route tracking
  useEffect(() => {
    const checkPermissions = async () => {
      if (!paramRouteId) {
        // General tracking - allow all authenticated users
        setHasPermission(!!user);
        setPermissionChecked(true);
        return;
      }

      if (!user) {
        setHasPermission(false);
        setPermissionChecked(true);
        return;
      }

      // Admin can track any route
      if (isAdmin) {
        setHasPermission(true);
        setPermissionChecked(true);
        return;
      }

      // Bus owner can only track their own buses
      if (isBusOwner) {
        const { data: ownerRoutes } = await supabase
          .from('owner_routes')
          .select('route_id')
          .eq('bus_owner_id', user.id)
          .eq('route_id', paramRouteId);

        setHasPermission(!!ownerRoutes && ownerRoutes.length > 0);
        setPermissionChecked(true);
        return;
      }

      // Regular user - check if they have a booking for this route
      if (paramBookingId) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, booking_id, route_id, user_id, date, status, trip_id')
          .eq('booking_id', paramBookingId)
          .eq('user_id', user.id)
          .maybeSingle();

        const hasBooking = !!booking && booking.route_id === paramRouteId;
        setHasPermission(hasBooking);
        setBookingDetails(
          hasBooking
            ? {
                id: booking.booking_id,
                route_id: booking.route_id,
                date: booking.date,
                status: booking.status,
                trip_id: booking.trip_id,
              }
            : null
        );
        setPermissionChecked(true);
        return;
      }

      // No booking ID provided for regular user
      setHasPermission(false);
      setPermissionChecked(true);
    };

    checkPermissions();
  }, [paramRouteId, paramBookingId, user, isAdmin, isBusOwner]);

  // Auto-select route if coming from booking
  useEffect(() => {
    if (paramRouteId && routes.length > 0) {
      setSelectedRouteId(paramRouteId);
    }
  }, [paramRouteId, routes]);


  // Collect all unique stops from routes
  const allStops = useMemo(() => {
    const stopSet = new Set<string>();
    routes.forEach((r) => {
      stopSet.add(r.from);
      stopSet.add(r.to);
      (r.viaPoints || []).forEach((v) => stopSet.add(v));
    });
    return Array.from(stopSet).sort();
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    // If tracking a specific booking, only show that route
    if (paramRouteId) {
      const specificRoute = routes.find(r => r.id === paramRouteId);
      return specificRoute ? [specificRoute] : [];
    }

    let result = routes;

    // Filter by tracking type
    if (trackingFilter === 'live') {
      result = result.filter(r => liveLocations.some(l => l.route_id === r.id));
    } else if (trackingFilter === 'simulated') {
      result = result.filter(r => !liveLocations.some(l => l.route_id === r.id));
    }

    // Filter by selected bus stop
    if (selectedStop !== 'all') {
      const stop = selectedStop.toLowerCase();
      result = result.filter(
        (r) =>
          r.from.toLowerCase() === stop ||
          r.to.toLowerCase() === stop ||
          (r.viaPoints || []).some((v) => v.toLowerCase() === stop)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.from.toLowerCase().includes(q) ||
          r.to.toLowerCase().includes(q) ||
          r.busType.toLowerCase().includes(q)
      );
    }

    return result;
  }, [routes, searchQuery, trackingFilter, liveLocations, selectedStop, paramRouteId]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) || null,
    [routes, selectedRouteId]
  );

  // Get bus number for passenger's booking
  const passengerBusNumber = useMemo(() => {
    if (!selectedRoute || !bookingDetails?.trip_id) return null;
    const trip = selectedRoute.trips?.find(t => t.id === bookingDetails.trip_id);
    return trip?.busNumber || null;
  }, [selectedRoute, bookingDetails]);

  const selectedRoutePoints = useMemo(() => {
    if (!selectedRoute) return [];
    const from = findCityCoordinates(selectedRoute.from);
    const to = findCityCoordinates(selectedRoute.to);
    if (!from || !to) return [];
    const viaCoords = (selectedRoute.viaPoints || [])
      .map((name) => findCityCoordinates(name))
      .filter((c): c is CityCoordinate => !!c);
    return [from, ...viaCoords, to];
  }, [selectedRoute]);

  const selectedRouteStops = useMemo(() => {
    if (!selectedRoute) return [];
    const from = findCityCoordinates(selectedRoute.from);
    const to = findCityCoordinates(selectedRoute.to);
    if (!from || !to) return [];
    const viaStops = (selectedRoute.viaPoints || [])
      .map((name) => ({ name, coord: findCityCoordinates(name) }))
      .filter((item): item is { name: string; coord: CityCoordinate } => !!item.coord);

    return [
      { name: selectedRoute.from, ...from },
      ...viaStops.map((item) => ({ name: item.name, ...item.coord })),
      { name: selectedRoute.to, ...to },
    ];
  }, [selectedRoute]);

  const selectedLiveLocation = selectedRoute
    ? liveLocations.find((l) => l.route_id === selectedRoute.id)
    : undefined;

  const selectedBusPosition = selectedLiveLocation
    ? { lat: selectedLiveLocation.latitude, lng: selectedLiveLocation.longitude }
    : null;

  const currentBusLocationName = useMemo(() => {
    if (!selectedBusPosition || selectedRouteStops.length === 0) return null;

    const nearest = selectedRouteStops.reduce(
      (best, stop, index) => {
        const dist = haversine(
          selectedBusPosition.lat,
          selectedBusPosition.lng,
          stop.lat,
          stop.lng
        );
        return dist < best.distance ? { index, distance: dist, name: stop.name } : best;
      },
      { index: -1, distance: Infinity, name: '' }
    );

    if (nearest.index === -1) return null;
    return nearest.distance <= 4 ? nearest.name : `Near ${nearest.name}`;
  }, [selectedBusPosition, selectedRouteStops]);

  const nextStopInfo = useMemo(() => {
    if (!selectedBusPosition || selectedRouteStops.length === 0) {
      return { name: null as string | null, eta: null as number | null };
    }

    const nearestIndex = selectedRouteStops.reduce((best, stop, index) => {
      const dist = haversine(
        selectedBusPosition.lat,
        selectedBusPosition.lng,
        stop.lat,
        stop.lng
      );
      return dist < best.distance ? { index, distance: dist } : best;
    }, { index: -1, distance: Infinity }).index;

    const nextIndex = nearestIndex < selectedRouteStops.length - 1 ? nearestIndex + 1 : -1;
    if (nextIndex === -1) {
      return { name: null, eta: null };
    }

    const nextStop = selectedRouteStops[nextIndex];
    const pendingDistance = haversine(
      selectedBusPosition.lat,
      selectedBusPosition.lng,
      nextStop.lat,
      nextStop.lng
    );
    const eta = Math.max(1, Math.round(pendingDistance / 0.6));
    return { name: nextStop.name, eta };
  }, [selectedBusPosition, selectedRouteStops]);

  useEffect(() => {
    if (!user?.id || !paramBookingId || !bookingDetails || reviewPrompted || !selectedRoute || !selectedBusPosition || selectedRoutePoints.length === 0) {
      return;
    }

    if (bookingDetails.status !== 'confirmed') {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (bookingDetails.date !== today) {
      return;
    }

    if (bookingDetails.route_id !== selectedRoute.id) {
      return;
    }

    const destination = selectedRoutePoints[selectedRoutePoints.length - 1];
    const distanceToDestination = haversine(
      selectedBusPosition.lat,
      selectedBusPosition.lng,
      destination.lat,
      destination.lng
    );

    if (distanceToDestination <= 1.0) {
      setReviewPrompted(true);
      setShowReviewDialog(true);
    }
  }, [paramBookingId, reviewPrompted, selectedRoute, selectedBusPosition, selectedRoutePoints, user, bookingDetails]);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setReviewPassengerName(user.user_metadata.full_name);
    }
  }, [user]);

  const currentRouteReviewId = selectedRoute?.id || routeReviewId;
  const currentRouteReviewName = selectedRoute?.name || routeReviewName || selectedRoute?.from + ' → ' + selectedRoute?.to;

  const renderRatingStars = (ratingValue: number, onSelect: (value: number) => void) => (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onSelect(star)}
          className={`text-2xl transition ${star <= ratingValue ? 'text-yellow-400' : 'text-muted-foreground'}`}
        >
          ★
        </button>
      ))}
    </div>
  );

  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReviewError('');

    if (!user?.id) {
      setReviewError('Please sign in to submit a review.');
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError('Please select a rating between 1 and 5 stars.');
      return;
    }

    if (!reviewText.trim()) {
      setReviewError('Please describe your trip experience.');
      return;
    }

    if (!reviewPassengerName.trim()) {
      setReviewError('Please enter your name.');
      return;
    }

    const { error } = await supabase.from('trip_reviews').insert([
      {
        user_id: user.id,
        passenger_name: reviewPassengerName,
        rating: reviewRating,
        review_text: reviewText.trim(),
        created_at: new Date().toISOString(),
        route_id: currentRouteReviewId,
        route_name: currentRouteReviewName,
      },
    ]);

    if (error) {
      setReviewError(error.message);
      return;
    }

    toast({
      title: 'Review submitted',
      description: 'Thank you for sharing feedback about your trip.',
    });

    setShowReviewDialog(false);
    setReviewSubmitted(true);
    setReviewRating(0);
    setReviewText('');
  };

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = L.map(mapRef.current, {
      center: SRI_LANKA_CENTER,
      zoom: SRI_LANKA_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(mapInstanceRef.current);
    setMapReady(true);

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Calculate route distance for the sidebar
  const getRouteDistance = (route: Route) => {
    const from = findCityCoordinates(route.from);
    const to = findCityCoordinates(route.to);
    if (!from || !to) return 0;
    const viaCoords = (route.viaPoints || [])
      .map((n) => findCityCoordinates(n))
      .filter((c): c is CityCoordinate => !!c);
    const pts = [from, ...viaCoords, to];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      total += haversine(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng);
    }
    return Math.round(total * 1.1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <div className="relative h-[calc(100vh-64px)]">
        <div className="absolute inset-0 bg-slate-950/95" />
        <div className="absolute inset-0 z-0">
          <div ref={mapRef} className="w-full h-full" />
        </div>

        <div className="absolute left-6 bottom-6 z-50 flex w-[22rem] flex-col gap-4">
          <div className="rounded-[32px] border border-white/10 bg-slate-950/85 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">Live tracking</p>
                <h1 className="mt-1 text-lg font-semibold text-white">
                  {paramRouteId ? 'Track Your Bus' : 'Live Bus Tracking'}
                </h1>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              {!permissionChecked ? (
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking permissions...
                </div>
              ) : !hasPermission ? (
                <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                  <p className="font-medium">
                    {paramRouteId ? 'You don\'t have permission to track this bus.' : 'Please sign in to view live tracking.'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full border border-white/10 bg-white/10 text-white"
                    onClick={() => navigate('/my-bookings')}
                  >
                    Go to My Bookings
                  </Button>
                </div>
              ) : paramRouteId ? (
                selectedRoute && liveLocations.find(l => l.route_id === selectedRoute.id) ? (
                  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                    <p className="font-medium">
                      {isBusOwner
                        ? 'Tracking your assigned bus route'
                        : isAdmin
                        ? 'Tracking this bus route'
                        : 'Tracking your booked bus route'}
                    </p>
                    <p className="mt-1 text-xs text-emerald-100/80">📡 Live GPS tracking active</p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                    <p className="font-medium">Live tracking unavailable for the moment</p>
                    <p className="mt-1 text-xs text-amber-100/80">
                      GPS tracking will be available when bus staff enables it
                    </p>
                  </div>
                )
              ) : (
                <p className="text-sm text-slate-200/80">
                  සියලුම active buses real-time track කරන්න
                </p>
              )}
            </div>

            {!paramRouteId && hasPermission && (
              <div className="mt-5 space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                  <Input
                    placeholder="Search route, city, bus type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 rounded-3xl border border-white/10 bg-slate-950/75 px-10 text-sm text-white placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Select value={trackingFilter} onValueChange={(v) => setTrackingFilter(v as 'all' | 'live' | 'simulated')}>
                    <SelectTrigger className="h-10 rounded-3xl border border-white/10 bg-slate-950/80 text-sm text-white">
                      <SelectValue placeholder="Tracking" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buses</SelectItem>
                      <SelectItem value="live">📡 Live GPS</SelectItem>
                      <SelectItem value="simulated">🚌 Simulated</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedStop} onValueChange={setSelectedStop}>
                    <SelectTrigger className="h-10 rounded-3xl border border-white/10 bg-slate-950/80 text-sm text-white">
                      <SelectValue placeholder="Bus Stop" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stops</SelectItem>
                      {allStops.map((stop) => (
                        <SelectItem key={stop} value={stop.toLowerCase()}>
                          📍 {stop}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-[32px] border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-xl">
            <div className="p-4 border-b border-white/10">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                {paramRouteId ? 'Your bus' : 'Available buses'}
              </p>
              <p className="mt-1 text-base font-semibold text-white">
                {paramRouteId ? 'Tracking the bus for your ticket' : 'Select a bus to view details'}
              </p>
            </div>
            <div className="max-h-[calc(100vh-28rem)] overflow-y-auto">
              {isLoading ? (
                <div className="flex min-h-[18rem] items-center justify-center p-6">
                  <Loader2 className="w-6 h-6 animate-spin text-white/80" />
                </div>
              ) : filteredRoutes.length === 0 ? (
                <div className="p-8 text-center text-slate-300">
                  <Bus className="mx-auto h-10 w-10 opacity-40" />
                  <p className="mt-3 text-sm">{searchQuery ? 'No matching routes' : 'No active routes'}</p>
                </div>
              ) : (
                filteredRoutes.map((route) => {
                  const isActive = route.id === selectedRouteId;
                  const config = BUS_TYPE_CONFIGS[route.busType];
                  const distance = getRouteDistance(route);
                  return (
                    <button
                      key={route.id}
                      onClick={() => setSelectedRouteId(isActive ? null : route.id)}
                      className={`w-full px-4 py-4 text-left transition ${
                        isActive ? 'bg-white/10' : 'hover:bg-white/5'
                      } ${isActive ? 'border-l-4 border-emerald-400' : 'border-l border-transparent'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{route.name}</p>
                          <p className="mt-1 text-xs text-slate-300 truncate">
                            {route.from} → {route.to}
                          </p>
                          {paramRouteId && passengerBusNumber ? (
                            <p className="mt-2 text-xs text-emerald-200">Bus number: <span className="font-semibold text-white">{passengerBusNumber}</span></p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                            <span className="rounded-full bg-white/10 px-2 py-1">{config?.name || route.busType}</span>
                            {liveLocations.find((l) => l.route_id === route.id) && (
                              <span className="rounded-full bg-amber-400/15 px-2 py-1 text-amber-200">📡 LIVE</span>
                            )}
                            <span className="rounded-full bg-white/10 px-2 py-1">{route.departureTime}</span>
                            {distance > 0 && <span className="rounded-full bg-white/10 px-2 py-1">{distance} km</span>}
                          </div>
                        </div>
                        <div className={`mt-1 h-3 w-3 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500/60'}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {selectedRoute && (
          <div className="absolute right-6 top-6 z-50 w-[24rem] rounded-[32px] border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur-xl text-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Route details</p>
                <h2 className="mt-2 text-xl font-semibold">{selectedRoute.name}</h2>
              </div>
              <span className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {liveLocations.find((l) => l.route_id === selectedRoute.id) ? 'Live' : 'Simulated'}
              </span>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-700">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Route</p>
                <p className="mt-1 font-medium">{selectedRoute.from} → {selectedRoute.to}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Departure</p>
                  <p className="mt-1 font-medium">{selectedRoute.departureTime}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Bus type</p>
                  <p className="mt-1 font-medium">{BUS_TYPE_CONFIGS[selectedRoute.busType]?.name || selectedRoute.busType}</p>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Bus number</p>
                <p className="mt-1 font-medium">{passengerBusNumber || 'Not assigned yet'}</p>
              </div>
              {selectedRoute.viaPoints && selectedRoute.viaPoints.length > 0 && (
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Via stops</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedRoute.viaPoints.join(' → ')}</p>
                </div>
              )}
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Estimated distance</p>
                <p className="mt-1 font-medium">{getRouteDistance(selectedRoute)} km</p>
              </div>
            </div>
          </div>
        )}

        {mapReady && mapInstanceRef.current &&
          (selectedRouteId ? routes.filter((r) => r.id === selectedRouteId) : filteredRoutes).map((route) => (
            <AnimatedBus
              key={route.id}
              route={route}
              mapInstance={mapInstanceRef.current!}
              isSelected={route.id === selectedRouteId}
              onSelect={() =>
                setSelectedRouteId((prev) =>
                  prev === route.id ? null : route.id
                )
              }
              liveLocation={liveLocations.find((l) => l.route_id === route.id)}
              allowSimulation={!paramRouteId && (isAdmin || isBusOwner)} // Only allow simulation for admin/staff when GPS is off
              busNumber={paramRouteId && route.id === paramRouteId ? passengerBusNumber : undefined}
            />
          ))}

        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Trip complete — leave a review</DialogTitle>
              <DialogDescription>
                Your bus has arrived at its final stop. Share your experience for this route.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Route</p>
                <p className="font-semibold text-foreground">{currentRouteReviewName || 'Selected bus route'}</p>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                  <Input
                    value={reviewPassengerName}
                    onChange={(e) => setReviewPassengerName(e.target.value)}
                    placeholder="Passenger name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Rating</label>
                  {renderRatingStars(reviewRating, setReviewRating)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Review</label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="What did you enjoy about this ride?"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {reviewText.length}/500 characters
                  </p>
                </div>

                {reviewError ? (
                  <p className="text-sm text-destructive">{reviewError}</p>
                ) : null}

                <DialogFooter className="justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowReviewDialog(false)}>
                    Close
                  </Button>
                  <Button type="submit" className="h-11">
                    Submit Review
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LiveTracking;
