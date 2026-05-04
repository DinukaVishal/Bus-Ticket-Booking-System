import { useEffect, useRef, useState, useMemo } from 'react';
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
import { Radio, Bus, MapPin, Phone, User, Loader2, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
}

const AnimatedBus = ({ route, mapInstance, isSelected, onSelect, liveLocation }: AnimatedBusProps) => {
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
    : simulatedPosition;
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
      className: 'custom-marker',
      html: `<div class="relative flex items-center justify-center">
        ${isSelected || isLiveGPS ? '<div class="absolute rounded-full animate-ping" style="width:' + (size + 12) + 'px;height:' + (size + 12) + 'px;background:' + color + '22"></div>' : ''}
        <div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:${isSelected ? 16 : 12}px;">
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
            <span class="text-xs">🕐 ${route.departureTime}</span>
            ${route.busNumber ? `<br/><span class="text-xs">🚌 ${route.busNumber}</span>` : ''}
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

// --- Main Page ---
const LiveTracking = () => {
  const { data: routes = [], isLoading } = useRoutes();
  const liveLocations = useLiveBusLocations();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingFilter, setTrackingFilter] = useState<'all' | 'live' | 'simulated'>('all');
  const [selectedStop, setSelectedStop] = useState<string>('all');

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
          r.busNumber?.toLowerCase().includes(q) ||
          r.driverName?.toLowerCase().includes(q) ||
          r.busType.toLowerCase().includes(q)
      );
    }

    return result;
  }, [routes, searchQuery, trackingFilter, liveLocations, selectedStop]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) || null,
    [routes, selectedRouteId]
  );

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
    <div className="min-h-screen bg-background/60 backdrop-blur-xl flex flex-col">
      <Header />

      <div className="flex-1 flex relative">
        {/* Sidebar */}
        <div className="w-80 bg-card border-r border-border flex flex-col z-10 overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
              <h2 className="font-display font-bold text-lg text-foreground">
                Live Bus Tracking
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              සියලුම active buses real-time track කරන්න
            </p>
          </div>

          {/* Search & Filter */}
          <div className="px-3 py-2 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Route, city, bus number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-8 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={trackingFilter} onValueChange={(v) => setTrackingFilter(v as 'all' | 'live' | 'simulated')}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Tracking" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buses</SelectItem>
                  <SelectItem value="live">📡 Live GPS</SelectItem>
                  <SelectItem value="simulated">🚌 Simulated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStop} onValueChange={setSelectedStop}>
                <SelectTrigger className="h-8 text-xs flex-1">
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

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredRoutes.map((route) => {
                const isActive = route.id === selectedRouteId;
                const config = BUS_TYPE_CONFIGS[route.busType];
                const distance = getRouteDistance(route);
                return (
                  <button
                    key={route.id}
                    onClick={() =>
                      setSelectedRouteId(isActive ? null : route.id)
                    }
                    className={`w-full text-left p-3 border-b border-border transition-colors ${
                      isActive
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {route.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {route.from} → {route.to}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {config?.name || route.busType}
                          </Badge>
                          {liveLocations.find(l => l.route_id === route.id) && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 text-white">
                              📡 LIVE GPS
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            🕐 {route.departureTime}
                          </span>
                          {distance > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              📏 {distance}km
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded details when selected */}
                    {isActive && (
                      <div className="mt-3 pt-2 border-t border-border space-y-1.5">
                        {route.busNumber && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Bus className="w-3.5 h-3.5" />
                            <span>{route.busNumber}</span>
                          </div>
                        )}
                        {route.driverName && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3.5 h-3.5" />
                            <span>Driver: {route.driverName}</span>
                          </div>
                        )}
                        {route.driverPhone && (
                          <a
                            href={`tel:${route.driverPhone}`}
                            className="flex items-center gap-2 text-xs text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{route.driverPhone}</span>
                          </a>
                        )}
                        {route.conductorName && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3.5 h-3.5" />
                            <span>Conductor: {route.conductorName}</span>
                          </div>
                        )}
                        {route.viaPoints && route.viaPoints.length > 0 && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>Via: {route.viaPoints.join(' → ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredRoutes.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Bus className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{searchQuery ? 'No matching routes' : 'No active routes'}</p>
                </div>
              )}
            </div>
          )}

          <div className="p-3 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {routes.length} bus{routes.length !== 1 ? 'es' : ''} •{' '}
                {liveLocations.length} live GPS
              </span>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />

          {/* Render only selected bus, or all filtered if none selected */}
          {mapReady && mapInstanceRef.current &&
            (selectedRouteId
              ? routes.filter(r => r.id === selectedRouteId)
              : filteredRoutes
            ).map((route) => (
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
                liveLocation={liveLocations.find(l => l.route_id === route.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
