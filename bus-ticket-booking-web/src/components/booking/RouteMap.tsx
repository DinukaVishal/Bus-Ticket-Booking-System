import { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route, Trip } from '@/types/booking';
import { findCityCoordinates, findRoutePath, SRI_LANKA_CENTER, SRI_LANKA_ZOOM, CityCoordinate } from '@/lib/sriLankaCoordinates';
import { MapPin, Navigation, Clock, MapPinned } from 'lucide-react';
import { useBusAnimation } from '@/hooks/useBusAnimation';

interface RouteMapProps {
  route: Route | null;
  selectedTrip?: Trip | null;
  className?: string;
}

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate total route distance through all points
const calculateTotalRouteDistance = (points: CityCoordinate[]): number => {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
  }
  return total;
};

// Estimate travel time based on distance and average bus speed
const estimateTravelTime = (distanceKm: number, busType: string): { hours: number; minutes: number } => {
  const avgSpeed = busType === 'normal' ? 35 : 40;
  const totalMinutes = (distanceKm / avgSpeed) * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return { hours, minutes };
};

const PUBLIC_OSRM_URL = 'https://router.project-osrm.org';

const buildOsrmRouteUrl = (baseUrl: string | undefined, coordinatePairs: string): string => {
  const trimmedBase = String(baseUrl || '').trim();
  const safeBase = trimmedBase && trimmedBase !== '/'
    ? trimmedBase.replace(/\/+$/,'')
    : PUBLIC_OSRM_URL;

  if (!coordinatePairs) {
    throw new Error('OSRM coordinate pairs are empty');
  }

  const routePath = `/route/v1/driving/${coordinatePairs}?overview=full&geometries=polyline6`;

  if (safeBase.startsWith('/')) {
    return `${safeBase.replace(/\/+$/,'')}${routePath}`;
  }

  try {
    return new URL(routePath, safeBase).toString();
  } catch (error) {
    console.warn('Invalid OSRM base URL, falling back to public OSRM. Base:', safeBase, 'Error:', error);
    return `${PUBLIC_OSRM_URL}${routePath}`;
  }
};

const fetchOsrmRoute = async (baseUrl: string | undefined, coordinatePairs: string, signal?: AbortSignal) => {
  const localUrl = buildOsrmRouteUrl(baseUrl, coordinatePairs);
  let response = await fetch(localUrl, { signal });
  let data = await response.json();

  if (data?.code !== 'Ok' || !data?.routes?.length) {
    const fallbackUrl = buildOsrmRouteUrl(PUBLIC_OSRM_URL, coordinatePairs);
    console.warn('Local OSRM failed, falling back to public OSRM:', data?.code || 'unknown');
    response = await fetch(fallbackUrl, { signal });
    data = await response.json();
    return { data, url: fallbackUrl, usedFallback: true, localFailure: data };
  }

  return { data, url: localUrl, usedFallback: false };
};

const decodePolyline = (encoded: string, precision = 6): [number, number][] => {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];
  const factor = 10 ** precision;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
};

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const RouteMap = ({ route, selectedTrip, className = '' }: RouteMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const decodedMarkersRef = useRef<L.CircleMarker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const [viaPoints, setViaPoints] = useState<CityCoordinate[]>([]);
  const [showLiveTracking, setShowLiveTracking] = useState(!!route);
  const [allRoutePoints, setAllRoutePoints] = useState<Array<{ lat: number; lng: number; name?: string }>>([]);
  const [osrmAvailable, setOsrmAvailable] = useState<boolean | null>(null);
  const [lastOsrmResponse, setLastOsrmResponse] = useState<string | null>(null);
  const [showOsrmDebug, setShowOsrmDebug] = useState(false);
  const [showDecodedPoints, setShowDecodedPoints] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const testOsrm = async () => {
    if (!route) {
      setLastOsrmResponse('No route selected');
      return;
    }

    const from = findCityCoordinates(route.from);
    const to = findCityCoordinates(route.to);
    if (!from || !to) {
      setLastOsrmResponse('Invalid route coordinates');
      setOsrmAvailable(false);
      return;
    }

    const viaNames = route.viaPoints && route.viaPoints.length > 0
      ? route.viaPoints
      : findRoutePath(route.from, route.to) || [];

    const viaCoordsLocal = viaNames
      .map(name => findCityCoordinates(name))
      .filter((c): c is CityCoordinate => !!c);

    const pts = [from, ...viaCoordsLocal, to];
    const coordPairs = pts.map(p => `${p.lng},${p.lat}`).join(';');
    const OSRM_SERVICE_URL = (import.meta.env.VITE_OSRM_URL as string) || PUBLIC_OSRM_URL;

    try {
      const { data: json, url, usedFallback } = await fetchOsrmRoute(OSRM_SERVICE_URL, coordPairs);

      console.debug('OSRM test request URL:', url, 'usedFallback:', usedFallback);
      setLastOsrmResponse(JSON.stringify(json, null, 2));
      setOsrmAvailable(!usedFallback && !!json?.routes?.length);
    } catch (err) {
      setLastOsrmResponse(String(err));
      setOsrmAvailable(false);
    }
  };
  const stopArrivalTimes = selectedTrip?.stopArrivalTimes || [];

  // Bus animation hook
  const busPosition = useBusAnimation({
    routePoints: allRoutePoints,
    departureTime: selectedTrip?.departureTime || route?.departureTime || '06:00',
    busType: route?.busType || 'normal',
    isSimulation: true,
  });

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: SRI_LANKA_CENTER,
        zoom: SRI_LANKA_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);

      mapInstanceRef.current.invalidateSize();
      setMapReady(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    mapInstanceRef.current.invalidateSize();

    // Clear existing markers and polyline
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    // Clear decoded geometry markers as well
    decodedMarkersRef.current.forEach(m => m.remove());
    decodedMarkersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (!route) {
      mapInstanceRef.current.setView(SRI_LANKA_CENTER, SRI_LANKA_ZOOM);
      setViaPoints([]);
      return;
    }

    const fromCity = findCityCoordinates(route.from);
    const toCity = findCityCoordinates(route.to);

    if (!fromCity || !toCity) return;

    // Prefer explicit via points configured for this route.
    // If no via points exist, fall back to common Sri Lanka route paths so the map follows real roads.
    const viaPointNames = route.viaPoints && route.viaPoints.length > 0
      ? route.viaPoints
      : findRoutePath(route.from, route.to) || [];

    const viaCoords = viaPointNames
      .map(name => findCityCoordinates(name))
      .filter((coord): coord is CityCoordinate => coord !== undefined);

    setViaPoints(viaCoords);
    setAllRoutePoints([fromCity, ...viaCoords, toCity]);

    const departureLabel = selectedTrip?.departureTime || route.departureTime || 'Scheduled';
    const arrivalLabel = selectedTrip?.arrivalTime || route.arrivalTime || 'Scheduled';
    
    // Create custom icons
    const startIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="flex items-center justify-center w-10 h-10 bg-primary rounded-full border-3 border-white shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    const endIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="flex items-center justify-center w-10 h-10 bg-destructive rounded-full border-3 border-white shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    const viaIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="flex items-center justify-center w-6 h-6 bg-amber-500 rounded-full border-2 border-white shadow-md">
        <div class="w-2 h-2 bg-white rounded-full"></div>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    // Add start marker
    const startMarker = L.marker([fromCity.lat, fromCity.lng], { icon: startIcon })
      .bindPopup(`<div class="text-center"><strong class="text-primary">🚌 Departure</strong><br/>${fromCity.name}<br/><span class="text-xs">${departureLabel}</span></div>`)
      .addTo(mapInstanceRef.current);
    
    markersRef.current.push(startMarker);

    // Add via point markers
    viaCoords.forEach((coord, index) => {
      const timeLabel = stopArrivalTimes[index] ? `<br/><span class="text-xs">Arrives: ${stopArrivalTimes[index]}</span>` : '';
      const marker = L.marker([coord.lat, coord.lng], { icon: viaIcon })
        .bindPopup(`<div class="text-center"><strong class="text-amber-600">📍 Stop ${index + 1}</strong><br/>${coord.name}${timeLabel}</div>`)
        .addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });

    // Add end marker
    const endMarker = L.marker([toCity.lat, toCity.lng], { icon: endIcon })
      .bindPopup(`<div class="text-center"><strong class="text-destructive">🏁 Arrival</strong><br/>${toCity.name}<br/><span class="text-xs">${arrivalLabel}</span></div>`)
      .addTo(mapInstanceRef.current);
    
    markersRef.current.push(endMarker);

    // Build route points array with via points
    const allPoints: [number, number][] = [
      [fromCity.lat, fromCity.lng],
      ...viaCoords.map(coord => [coord.lat, coord.lng] as [number, number]),
      [toCity.lat, toCity.lng],
    ];

    const coordinatePairs = allPoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const OSRM_SERVICE_URL = (import.meta.env.VITE_OSRM_URL as string) || PUBLIC_OSRM_URL;
    const controller = new AbortController();

    

    const drawRouteLine = async () => {
      if (allPoints.length < 2) return;

      mapInstanceRef.current?.invalidateSize();

      try {
        const { data, url: resolvedOsrmUrl, usedFallback } = await fetchOsrmRoute(OSRM_SERVICE_URL, coordinatePairs, controller.signal);
        console.debug('OSRM draw route URL:', resolvedOsrmUrl, 'usedFallback:', usedFallback);
        const encodedGeometry = data?.routes?.[0]?.geometry;
        const routePoints = encodedGeometry
          ? decodePolyline(encodedGeometry, 6)
          : allPoints;

        // Mark that OSRM provided a route
        setOsrmAvailable(!usedFallback && (!!encodedGeometry || !!data?.routes?.length));

        // Use the OSRM road geometry for both the route line and bus animation path.
        setAllRoutePoints(routePoints.map(([lat, lng]) => ({ lat, lng })));

        const drawHighlightedRoute = (points: [number, number][]) => {
          // Add a subtle glow background to make the route stand out on any map style.
          L.polyline(points, {
            color: '#ffffff',
            weight: 12,
            opacity: 0.35,
            lineJoin: 'round',
            lineCap: 'round',
            interactive: false,
            pane: 'overlayPane',
          }).addTo(mapInstanceRef.current!);

          polylineRef.current = L.polyline(points, {
            color: '#3b82f6',
            weight: 7,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round',
            interactive: false,
            pane: 'overlayPane',
          }).addTo(mapInstanceRef.current!);

          requestAnimationFrame(() => {
            mapInstanceRef.current?.invalidateSize();
            polylineRef.current?.bringToFront();
          });
        };

        drawHighlightedRoute(routePoints);
      } catch (error) {
        // OSRM not reachable or failed — fall back to straight-line points
        setOsrmAvailable(false);
        const drawHighlightedRoute = (points: [number, number][]) => {
          L.polyline(points, {
            color: '#ffffff',
            weight: 12,
            opacity: 0.35,
            lineJoin: 'round',
            lineCap: 'round',
            interactive: false,
            pane: 'overlayPane',
          }).addTo(mapInstanceRef.current!);

          polylineRef.current = L.polyline(points, {
            color: '#3b82f6',
            weight: 7,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round',
            interactive: false,
            pane: 'overlayPane',
          }).addTo(mapInstanceRef.current!);

          polylineRef.current.bringToFront();
        };

        drawHighlightedRoute(allPoints);
      }
    };

    if (mapInstanceRef.current) {
      mapInstanceRef.current.whenReady(() => {
        mapInstanceRef.current?.invalidateSize();
        drawRouteLine();

        const bounds = L.latLngBounds(allPoints);
        mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50] });
      });
    } else {
      drawRouteLine();
      const bounds = L.latLngBounds(allPoints);
      mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      controller.abort();
    };

  }, [route, selectedTrip, mapReady]);

  // Draw decoded geometry points as small circle markers for debugging/visual verification
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // remove previous decoded markers
    decodedMarkersRef.current.forEach(m => m.remove());
    decodedMarkersRef.current = [];

    if (!showDecodedPoints || allRoutePoints.length === 0) return;

    allRoutePoints.forEach((p, idx) => {
      const cm = L.circleMarker([p.lat, p.lng], {
        radius: 4,
        color: '#f59e0b',
        weight: 1,
        fillColor: '#f59e0b',
        fillOpacity: 0.95,
        pane: 'overlayPane',
      }).addTo(mapInstanceRef.current!);

      cm.bindTooltip(`${idx + 1}`, { permanent: false, direction: 'top', className: 'text-xs' });
      decodedMarkersRef.current.push(cm);
    });

    return () => {
      decodedMarkersRef.current.forEach(m => m.remove());
      decodedMarkersRef.current = [];
    };
  }, [showDecodedPoints, allRoutePoints]);

  // Update live tracking when route changes
  useEffect(() => {
    setShowLiveTracking(!!route);
  }, [route, selectedTrip]);

  // Bus marker animation effect
  useEffect(() => {
    if (!mapInstanceRef.current || !showLiveTracking || !busPosition || !route) {
      if (busMarkerRef.current) {
        busMarkerRef.current.remove();
        busMarkerRef.current = null;
      }
      return;
    }

    const busIcon = L.divIcon({
      className: 'custom-marker bus-pulse',
      html: `<div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full bg-emerald-500/20 animate-ping"></div>
        <div class="relative w-10 h-10 bg-emerald-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center" style="transform: rotate(${busPosition.bearing - 90}deg)">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0">
            <path d="M4 16V6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10M6 20h12M6 14h12M8 20v-2M16 20v-2M7 10h2M15 10h2"/>
            <rect x="4" y="6" width="16" height="8" rx="2" fill="white" opacity="0.9"/>
            <text x="12" y="12" text-anchor="middle" fill="#10b981" font-size="6" font-weight="bold">🚌</text>
          </svg>
        </div>
      </div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker([busPosition.lat, busPosition.lng], { icon: busIcon, zIndexOffset: 1000 })
        .bindPopup(`<div class="text-center">
          <strong class="text-emerald-600">🚌 Live Bus</strong><br/>
          <span class="text-xs">Progress: ${Math.round(busPosition.progress * 100)}%</span><br/>
          ${busPosition.nextStop ? `<span class="text-xs">Next: ${busPosition.nextStop}</span>` : ''}
        </div>`)
        .addTo(mapInstanceRef.current);
    } else {
      busMarkerRef.current.setLatLng([busPosition.lat, busPosition.lng]);
      busMarkerRef.current.setIcon(busIcon);
      busMarkerRef.current.setPopupContent(`<div class="text-center">
        <strong class="text-emerald-600">🚌 Live Bus</strong><br/>
        <span class="text-xs">Progress: ${Math.round(busPosition.progress * 100)}%</span><br/>
        ${busPosition.nextStop ? `<span class="text-xs">Next: ${busPosition.nextStop}</span>` : ''}
      </div>`);
    }
  }, [busPosition, showLiveTracking, route]);

  // Calculate distance and travel time through all points
  const routeInfo = useMemo(() => {
    if (!route) return null;
    
    const fromCity = findCityCoordinates(route.from);
    const toCity = findCityCoordinates(route.to);
    
    if (!fromCity || !toCity) return null;

    const viaPointNames = route.viaPoints && route.viaPoints.length > 0 
      ? route.viaPoints 
      : [];
    
    const viaCoords = viaPointNames
      .map(name => findCityCoordinates(name))
      .filter((coord): coord is CityCoordinate => coord !== undefined);

    const allCityPoints = [fromCity, ...viaCoords, toCity];
    const routeDistance = calculateTotalRouteDistance(allCityPoints);
    const roadDistance = routeDistance * 1.1;
    const travelTime = estimateTravelTime(roadDistance, route.busType);
    
    return {
      distance: Math.round(roadDistance),
      travelTime,
      stops: viaCoords.length,
    };
  }, [route]);

  return (
    <>
      <div className={`relative rounded-xl overflow-hidden border border-border ${className}`}>
        <div ref={mapRef} className="w-full h-full min-h-[280px]" />

        {/* OSRM connectivity status badge + debug */}
        {route && (
          <div className="absolute left-3 bottom-3 z-[1200] max-w-[320px]">
            <div className="flex gap-2 items-center">
              {osrmAvailable === null && (
                <div className="px-3 py-1 rounded-md bg-yellow-400/10 border border-yellow-500/20 text-yellow-600 text-sm">Checking routing backend…</div>
              )}
              {osrmAvailable === true && (
                <div className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">Routing: OSRM</div>
              )}
              {osrmAvailable === false && (
                <div className="px-3 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">OSRM unreachable — using fallback</div>
              )}

              <button
                onClick={() => { testOsrm(); setShowOsrmDebug(s => !s); }}
                className="ml-2 px-2 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-sm"
              >
                Test OSRM
              </button>
              <button
                onClick={() => setShowDecodedPoints(s => !s)}
                className="ml-2 px-2 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-sm"
              >
                {showDecodedPoints ? 'Hide decoded points' : 'Show decoded points'}
              </button>
            </div>

            {showOsrmDebug && lastOsrmResponse && (
              <pre className="mt-2 max-h-40 overflow-auto text-xs p-2 bg-slate-900/80 text-white rounded">{lastOsrmResponse}</pre>
            )}
          </div>
        )}

        {!route && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Route එකක් select කරන්න map බලන්න</p>
            </div>
          </div>
        )}

        
        {/* Distance, Time & Stops Info - Top Right */}
        {route && routeInfo && (
          <div className="absolute top-3 right-3 z-[1100] bg-card/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Navigation className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Distance</p>
                  <p className="text-sm font-bold text-foreground">{routeInfo.distance} km</p>
                </div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Est. Time</p>
                  <p className="text-sm font-bold text-foreground">
                    {routeInfo.travelTime.hours > 0 && `${routeInfo.travelTime.hours}h `}
                    {routeInfo.travelTime.minutes}m
                  </p>
                </div>
              </div>
              {routeInfo.stops > 0 && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <MapPinned className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Stops</p>
                      <p className="text-sm font-bold text-foreground">{routeInfo.stops}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
      </div>

      {route && selectedTrip && route.viaPoints?.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-card/95 backdrop-blur-sm p-4 shadow-sm">
          <div className="space-y-3">
            <div className="font-semibold text-foreground text-sm">Intermediate stop times</div>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/50 p-3">
              {route.viaPoints.map((stop, index) => (
                <div key={stop} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-foreground font-medium truncate">{stop}</span>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded text-xs">
                    {stopArrivalTimes[index] || 'TBA'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RouteMap;