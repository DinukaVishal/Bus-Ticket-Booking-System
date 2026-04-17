import { useState, useEffect, useCallback, useRef } from 'react';
import { CityCoordinate } from '@/lib/sriLankaCoordinates';

interface BusPosition {
  lat: number;
  lng: number;
  progress: number; // 0-1 overall progress
  currentSegment: number;
  status: 'not_started' | 'in_transit' | 'completed';
  nextStop: string | null;
  bearing: number; // direction bus is facing
}

// Interpolate between two points
const interpolate = (
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
  t: number
): { lat: number; lng: number } => ({
  lat: p1.lat + (p2.lat - p1.lat) * t,
  lng: p1.lng + (p2.lng - p1.lng) * t,
});

// Calculate bearing between two points (for bus rotation)
const calculateBearing = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

// Calculate distance between two coords
const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface UseBusAnimationProps {
  routePoints: CityCoordinate[];
  departureTime: string; // "HH:mm" format
  busType: string;
  isSimulation?: boolean; // if true, run a demo animation loop
}

export const useBusAnimation = ({
  routePoints,
  departureTime,
  busType,
  isSimulation = true,
}: UseBusAnimationProps): BusPosition | null => {
  const [position, setPosition] = useState<BusPosition | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const simulationStartRef = useRef<number>(Date.now());

  // Calculate segment distances
  const getSegmentDistances = useCallback(() => {
    const distances: number[] = [];
    for (let i = 0; i < routePoints.length - 1; i++) {
      distances.push(
        haversine(
          routePoints[i].lat, routePoints[i].lng,
          routePoints[i + 1].lat, routePoints[i + 1].lng
        )
      );
    }
    return distances;
  }, [routePoints]);

  useEffect(() => {
    if (routePoints.length < 2) {
      setPosition(null);
      return;
    }

    const segmentDistances = getSegmentDistances();
    const totalDistance = segmentDistances.reduce((a, b) => a + b, 0) * 1.1; // road curvature factor
    const avgSpeed = busType === 'normal' ? 35 : 40; // km/h
    const totalTravelTimeMs = (totalDistance / avgSpeed) * 3600 * 1000;

    // Cumulative distance ratios for each segment
    const totalRaw = segmentDistances.reduce((a, b) => a + b, 0);
    const cumulativeRatios: number[] = [0];
    let cumDist = 0;
    for (const d of segmentDistances) {
      cumDist += d;
      cumulativeRatios.push(cumDist / totalRaw);
    }

    if (isSimulation) {
      // Simulation mode: loop every `totalTravelTimeMs` capped at 30s for demo
      const DEMO_DURATION = 30000; // 30 second loop
      simulationStartRef.current = Date.now();

      const animate = () => {
        const elapsed = (Date.now() - simulationStartRef.current) % DEMO_DURATION;
        const progress = elapsed / DEMO_DURATION;

        // Find which segment we're in
        let segIdx = 0;
        for (let i = 0; i < cumulativeRatios.length - 1; i++) {
          if (progress >= cumulativeRatios[i] && progress < cumulativeRatios[i + 1]) {
            segIdx = i;
            break;
          }
        }
        if (progress >= 1) segIdx = routePoints.length - 2;

        const segStart = cumulativeRatios[segIdx];
        const segEnd = cumulativeRatios[segIdx + 1];
        const segProgress = segEnd > segStart
          ? (progress - segStart) / (segEnd - segStart)
          : 0;

        const p1 = routePoints[segIdx];
        const p2 = routePoints[segIdx + 1];
        const pos = interpolate(p1, p2, Math.min(segProgress, 1));
        const bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);

        const nextStopIdx = segIdx + 1;
        const nextStop = nextStopIdx < routePoints.length ? routePoints[nextStopIdx].name : null;

        setPosition({
          ...pos,
          progress,
          currentSegment: segIdx,
          status: 'in_transit',
          nextStop,
          bearing,
        });

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Real-time mode based on departure time
      const updateRealPosition = () => {
        const now = new Date();
        const [hours, minutes] = departureTime.split(':').map(Number);
        const departure = new Date();
        departure.setHours(hours, minutes, 0, 0);

        const elapsed = now.getTime() - departure.getTime();

        if (elapsed < 0) {
          setPosition({
            lat: routePoints[0].lat,
            lng: routePoints[0].lng,
            progress: 0,
            currentSegment: 0,
            status: 'not_started',
            nextStop: routePoints.length > 1 ? routePoints[1].name : null,
            bearing: routePoints.length > 1
              ? calculateBearing(routePoints[0].lat, routePoints[0].lng, routePoints[1].lat, routePoints[1].lng)
              : 0,
          });
          return;
        }

        if (elapsed > totalTravelTimeMs) {
          const last = routePoints[routePoints.length - 1];
          setPosition({
            lat: last.lat,
            lng: last.lng,
            progress: 1,
            currentSegment: routePoints.length - 2,
            status: 'completed',
            nextStop: null,
            bearing: 0,
          });
          return;
        }

        const progress = elapsed / totalTravelTimeMs;
        let segIdx = 0;
        for (let i = 0; i < cumulativeRatios.length - 1; i++) {
          if (progress >= cumulativeRatios[i] && progress < cumulativeRatios[i + 1]) {
            segIdx = i;
            break;
          }
        }

        const segStart = cumulativeRatios[segIdx];
        const segEnd = cumulativeRatios[segIdx + 1];
        const segProgress = (progress - segStart) / (segEnd - segStart);

        const p1 = routePoints[segIdx];
        const p2 = routePoints[segIdx + 1];
        const pos = interpolate(p1, p2, Math.min(segProgress, 1));
        const bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);

        setPosition({
          ...pos,
          progress,
          currentSegment: segIdx,
          status: 'in_transit',
          nextStop: segIdx + 1 < routePoints.length ? routePoints[segIdx + 1].name : null,
          bearing,
        });
      };

      updateRealPosition();
      const interval = setInterval(updateRealPosition, 3000);
      return () => clearInterval(interval);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [routePoints, departureTime, busType, isSimulation, getSegmentDistances]);

  return position;
};
