import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SRI_LANKA_CENTER, SRI_LANKA_ZOOM, findCityCoordinates, findRoutePath } from '@/lib/sriLankaCoordinates';
import { Route } from '@/types/booking';

interface Props {
  routes?: Route[];
}

const PUBLIC_OSRM_URL = 'https://router.project-osrm.org';

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

const buildOsrmRouteUrl = (baseUrl: string | undefined, coordinatePairs: string): string => {
  const trimmedBase = String(baseUrl || '').trim();
  const safeBase = trimmedBase && trimmedBase !== '/'
    ? trimmedBase.replace(/\/+$/,'')
    : PUBLIC_OSRM_URL;

  const routePath = `/route/v1/driving/${coordinatePairs}?overview=full&geometries=polyline6`;

  try {
    return new URL(routePath, safeBase).toString();
  } catch (error) {
    return `${PUBLIC_OSRM_URL}${routePath}`;
  }
};

const fetchOsrmRoute = async (baseUrl: string | undefined, coordinatePairs: string, signal?: AbortSignal) => {
  const url = buildOsrmRouteUrl(baseUrl, coordinatePairs);
  const res = await fetch(url, { signal });
  return res.json();
};

const HomePageMap = ({ routes = [] }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Fix default marker icons
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    // Create map instance
    const map = L.map(mapRef.current, {
      center: SRI_LANKA_CENTER as L.LatLngExpression,
      zoom: SRI_LANKA_ZOOM,
      preferCanvas: true,
    });

    // Store reference
    mapInstanceRef.current = map;

    // Add tile layer - using OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 0,
    }).addTo(map);

    // Add city markers
    const majorCities = [
      { name: 'Colombo', lat: 6.9271, lng: 79.8612 },
      { name: 'Kandy', lat: 7.2906, lng: 80.6337 },
      { name: 'Galle', lat: 6.0535, lng: 80.2210 },
      { name: 'Jaffna', lat: 9.6615, lng: 80.0255 },
      { name: 'Matara', lat: 5.9450, lng: 80.5550 },
      { name: 'Anuradhapura', lat: 8.3114, lng: 80.4037 },
      { name: 'Trincomalee', lat: 8.5874, lng: 81.2152 },
      { name: 'Kurunegala', lat: 7.4866, lng: 80.3647 },
    ];

    majorCities.forEach(city => {
      L.marker([city.lat, city.lng])
        .bindPopup(`<div class="font-semibold text-sm">${city.name}</div>`)
        .addTo(map);
    });

    // Trigger map resize
    map.invalidateSize();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Draw selected route when it changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // remove previous overlays
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (!selectedRoute) {
      mapInstanceRef.current.setView(SRI_LANKA_CENTER as L.LatLngExpression, SRI_LANKA_ZOOM);
      return;
    }

    const from = findCityCoordinates(selectedRoute.from);
    const to = findCityCoordinates(selectedRoute.to);
    const viaNames = selectedRoute.viaPoints && selectedRoute.viaPoints.length > 0
      ? selectedRoute.viaPoints
      : findRoutePath(selectedRoute.from, selectedRoute.to) || [];

    const viaCoords = viaNames
      .map(name => findCityCoordinates(name))
      .filter((c): c is { lat: number; lng: number; name?: string } => !!c);

    if (!from || !to) return;

    const allPoints = [from, ...viaCoords, to];

    // Add markers
    const start = L.marker([from.lat, from.lng]).bindPopup(`${from.name} (Start)`).addTo(mapInstanceRef.current!);
    markersRef.current.push(start);
    viaCoords.forEach(vc => {
      const m = L.marker([vc.lat, vc.lng]).bindPopup(vc.name || 'Via');
      m.addTo(mapInstanceRef.current!);
      markersRef.current.push(m);
    });
    const end = L.marker([to.lat, to.lng]).bindPopup(`${to.name} (End)`).addTo(mapInstanceRef.current!);
    markersRef.current.push(end);

    const coordinatePairs = allPoints.map(p => `${p.lng},${p.lat}`).join(';');
    const OSRM_SERVICE_URL = (import.meta.env.VITE_OSRM_URL as string) || PUBLIC_OSRM_URL;
    const controller = new AbortController();

    const draw = async () => {
      try {
        const data = await fetchOsrmRoute(OSRM_SERVICE_URL, coordinatePairs, controller.signal);
        const encoded = data?.routes?.[0]?.geometry;
        const routePoints = encoded ? decodePolyline(encoded, 6) : allPoints.map(p => [p.lat, p.lng] as [number, number]);

        polylineRef.current = L.polyline(routePoints as any, { color: '#3b82f6', weight: 6 }).addTo(mapInstanceRef.current!);
        const bounds = L.latLngBounds(routePoints as any);
        mapInstanceRef.current?.fitBounds(bounds, { padding: [40, 40] });
      } catch (err) {
        // fallback to straight lines
        const pts = allPoints.map(p => [p.lat, p.lng] as [number, number]);
        polylineRef.current = L.polyline(pts as any, { color: '#3b82f6', weight: 6 }).addTo(mapInstanceRef.current!);
        const bounds = L.latLngBounds(pts as any);
        mapInstanceRef.current?.fitBounds(bounds, { padding: [40, 40] });
      }
    };

    draw();

    return () => controller.abort();
  }, [selectedRoute]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full rounded-2xl shadow-2xl overflow-hidden border border-white/10"
        style={{ height: '550px', backgroundColor: '#1e293b' }}
      />

      {/* Popular routes overlay - top right */}
      <div className="absolute top-4 right-4 z-[1200] w-72 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 overflow-hidden">
        <div className="px-3 py-2 border-b border-border/30 font-semibold">Popular routes</div>
        <div className="max-h-60 overflow-auto">
          {(routes || []).slice(0, 8).map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRoute(r)}
              className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 border-b border-border/10 hover:bg-white/5 transition ${selectedRoute?.id === r.id ? 'bg-white/5' : ''}`}
            >
              <div className="truncate">
                <div className="text-sm font-medium text-foreground truncate">{r.from} → {r.to}</div>
                <div className="text-xs text-muted-foreground truncate">{r.name}</div>
              </div>
              <div className="text-sm text-primary font-semibold">Rs {r.price ?? ''}</div>
            </button>
          ))}
          {routes.length === 0 && <div className="p-3 text-sm text-muted-foreground">No routes available</div>}
        </div>
      </div>
    </div>
  );
};

export default HomePageMap;
