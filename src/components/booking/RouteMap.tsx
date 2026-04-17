import { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route } from '@/types/booking';
import { findCityCoordinates, findRoutePath, SRI_LANKA_CENTER, SRI_LANKA_ZOOM, CityCoordinate } from '@/lib/sriLankaCoordinates';
import { MapPin, Navigation, Clock, MapPinned, Radio } from 'lucide-react';
import { useBusAnimation } from '@/hooks/useBusAnimation';

interface RouteMapProps {
  route: Route | null;
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

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const RouteMap = ({ route, className = '' }: RouteMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const [viaPoints, setViaPoints] = useState<CityCoordinate[]>([]);
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [allRoutePoints, setAllRoutePoints] = useState<CityCoordinate[]>([]);

  // Bus animation hook
  const busPosition = useBusAnimation({
    routePoints: allRoutePoints,
    departureTime: route?.departureTime || '06:00',
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
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers and polyline
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
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

    // ONLY use custom via points from route - do NOT fall back to predefined paths
    // This ensures admin-defined routes show exactly what was configured
    const viaPointNames = route.viaPoints && route.viaPoints.length > 0 
      ? route.viaPoints 
      : [];  // Empty array - no fallback to predefined paths
    
    const viaCoords = viaPointNames
      .map(name => findCityCoordinates(name))
      .filter((coord): coord is CityCoordinate => coord !== undefined);
    
    setViaPoints(viaCoords);
    setAllRoutePoints([fromCity, ...viaCoords, toCity]);

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
      .bindPopup(`<div class="text-center"><strong class="text-primary">🚌 Departure</strong><br/>${fromCity.name}</div>`)
      .addTo(mapInstanceRef.current);
    
    markersRef.current.push(startMarker);

    // Add via point markers
    viaCoords.forEach((coord, index) => {
      const marker = L.marker([coord.lat, coord.lng], { icon: viaIcon })
        .bindPopup(`<div class="text-center"><strong class="text-amber-600">📍 Stop ${index + 1}</strong><br/>${coord.name}</div>`)
        .addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });

    // Add end marker
    const endMarker = L.marker([toCity.lat, toCity.lng], { icon: endIcon })
      .bindPopup(`<div class="text-center"><strong class="text-destructive">🏁 Arrival</strong><br/>${toCity.name}</div>`)
      .addTo(mapInstanceRef.current);
    
    markersRef.current.push(endMarker);

    // Build route points array with via points
    const allPoints: [number, number][] = [
      [fromCity.lat, fromCity.lng],
      ...viaCoords.map(coord => [coord.lat, coord.lng] as [number, number]),
      [toCity.lat, toCity.lng],
    ];

    // Draw smooth route line through all points
    polylineRef.current = L.polyline(allPoints, {
      color: 'hsl(var(--primary))',
      weight: 4,
      opacity: 0.9,
      dashArray: viaCoords.length > 0 ? undefined : '10, 10',
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(mapInstanceRef.current);

    // Fit map to show all points
    const bounds = L.latLngBounds(allPoints);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });

  }, [route]);

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
    <div className={`relative rounded-xl overflow-hidden border border-border ${className}`}>
      <div ref={mapRef} className="w-full h-full min-h-[300px]" />
      
      {!route && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Route එකක් select කරන්න map බලන්න</p>
          </div>
        </div>
      )}

      {/* Live Tracking Toggle */}
      {route && (
        <button
          onClick={() => setShowLiveTracking(!showLiveTracking)}
          className={`absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs font-semibold transition-all ${
            showLiveTracking
              ? 'bg-emerald-500 text-white'
              : 'bg-card/95 backdrop-blur-sm text-foreground hover:bg-card'
          }`}
        >
          <Radio className={`w-4 h-4 ${showLiveTracking ? 'animate-pulse' : ''}`} />
          {showLiveTracking ? 'LIVE' : 'Live Track'}
        </button>
      )}

      {/* Live tracking info badge */}
      {route && showLiveTracking && busPosition && (
        <div className="absolute top-14 left-3 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-foreground">Bus Location</span>
          </div>
          <div className="text-muted-foreground">
            Progress: <span className="font-bold text-foreground">{Math.round(busPosition.progress * 100)}%</span>
          </div>
          {busPosition.nextStop && (
            <div className="text-muted-foreground">
              Next Stop: <span className="font-bold text-foreground">{busPosition.nextStop}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Distance, Time & Stops Info - Top Right */}
      {route && routeInfo && (
        <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Navigation className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Distance</p>
                <p className="text-sm font-bold text-foreground">{routeInfo.distance} km</p>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Est. Time</p>
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
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <MapPinned className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Stops</p>
                    <p className="text-sm font-bold text-foreground">{routeInfo.stops}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Legend with Via Points - Bottom Left */}
      {route && (
        <div className="absolute bottom-3 left-3 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg text-xs max-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
            <span className="truncate">Departure: {route.from}</span>
          </div>
          {viaPoints.length > 0 && (
            <div className="flex items-start gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                Via: {viaPoints.map(v => v.name).join(' → ')}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive flex-shrink-0" />
            <span className="truncate">Arrival: {route.to}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteMap;