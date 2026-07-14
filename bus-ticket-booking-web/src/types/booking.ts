export type BusType = 'rosa' | 'luxury_ac' | 'super_long' | 'normal';

export interface Trip {
  id: string;
  departureTime: string;
  arrivalTime?: string;
  price: number;
  busNumber?: string;
  driverName?: string;
  driverPhone?: string;
  conductorName?: string;
  conductorPhone?: string;
  stopArrivalTimes?: string[];
}

export interface Route {
  id: string;
  name: string;
  from: string;
  to: string;
  busType: BusType;
  totalSeats: number;
  // Route-level fallback values for legacy components
  departureTime?: string;
  arrivalTime?: string;
  price?: number;
  // Multiple trips per route
  trips: Trip[];
  // Via points (intermediate stops)
  viaPoints?: string[];
  // Driver's bus information
  driverId?: string;
}

export interface Booking {
  id: string;
  routeId?: string;
  tripId: string;
  routeName: string;
  date: string;
  seatNumber: number;
  passengerName: string;
  phoneNumber: string;
  gender: 'male' | 'female';
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_method?: 'Card' | 'Mobile Money';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_id?: string;
  createdAt: string;
}

export interface CancelRequest {
  cancel_request_id: string;
  bookingId: string;
  bookingIds: string[];
  seatNumbers: number[];
  userId: string;
  routeId?: string;
  tripId?: string;
  travelDate?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  refundAmount: number;
  processedAt?: string | null;
  note?: string | null;
}

export interface Schedule {
  id: string;
  routeId: string;
  date: string;
  bookedSeats: number[];
}

export type SeatStatus = 'available' | 'booked' | 'selected';

// Seat configuration for different bus types
export interface SeatConfig {
  isWindow: boolean;
  isAisle: boolean;
  position: 'left' | 'right';
}

// Bus type configuration with Sri Lankan context
export interface BusTypeConfig {
  type: BusType;
  name: string;
  sinhalaName: string;
  defaultSeats: number;
  layout: '2x2' | '2x3';
  isAC: boolean;
  backRowSeats: number;
  jumpSeats?: number; // Optional jump seats (foldable aisle seats)
}

export const BUS_TYPE_CONFIGS: Record<BusType, BusTypeConfig> = {
  rosa: {
    type: 'rosa',
    name: 'Rosa / Coaster',
    sinhalaName: 'රෝසා / කෝස්ටර්',
    defaultSeats: 26,
    layout: '2x2',
    isAC: true,
    backRowSeats: 5,
    jumpSeats: 6, // 6 foldable aisle seats (J27-J32)
  },
  luxury_ac: {
    type: 'luxury_ac', 
    name: 'Luxury A/C',
    sinhalaName: 'ලක්ෂරි ඒසී',
    defaultSeats: 45,
    layout: '2x2',
    isAC: true,
    backRowSeats: 5,
  },
  super_long: {
    type: 'super_long',
    name: 'Super Long',
    sinhalaName: 'සුපර් ලෝන්ග්',
    defaultSeats: 54,
    layout: '2x2',
    isAC: true,
    backRowSeats: 6,
  },
  normal: {
    type: 'normal',
    name: 'Normal Bus',
    sinhalaName: 'සාමාන්‍ය බස්',
    defaultSeats: 54,
    layout: '2x3',
    isAC: false,
    backRowSeats: 6,
  },
};

export function normalizeBusType(value?: string): BusType {
  if (!value) return 'normal';

  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[_/\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+bus$/g, '');

  if (normalized.includes('luxury') || normalized === 'ac' || normalized === 'a c') {
    return 'luxury_ac';
  }

  if (normalized.includes('rosa') || normalized.includes('coaster')) {
    return 'rosa';
  }

  if (normalized.includes('super') && normalized.includes('long')) {
    return 'super_long';
  }

  if (normalized.includes('normal')) {
    return 'normal';
  }

  return 'normal';
}
