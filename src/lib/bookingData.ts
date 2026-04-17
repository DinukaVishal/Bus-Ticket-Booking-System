import { Route, Booking, Schedule } from '@/types/booking';

const ROUTES_KEY = 'bus_routes';
const BOOKINGS_KEY = 'bus_bookings';
const SCHEDULES_KEY = 'bus_schedules';

// Default routes
const defaultRoutes: Route[] = [
  { id: 'r1', name: 'Colombo to Kandy', from: 'Colombo', to: 'Kandy', departureTime: '08:00 AM', price: 1200, busType: 'luxury_ac', totalSeats: 45 },
  { id: 'r2', name: 'Colombo to Galle', from: 'Colombo', to: 'Galle', departureTime: '09:30 AM', price: 450, busType: 'normal', totalSeats: 54 },
  { id: 'r3', name: 'Kandy to Jaffna', from: 'Kandy', to: 'Jaffna', departureTime: '06:00 AM', price: 2200, busType: 'super_long', totalSeats: 54 },
  { id: 'r4', name: 'Colombo to Negombo', from: 'Colombo', to: 'Negombo', departureTime: '07:00 AM', price: 180, busType: 'rosa', totalSeats: 26 },
  { id: 'r5', name: 'Galle to Matara', from: 'Galle', to: 'Matara', departureTime: '10:00 AM', price: 150, busType: 'normal', totalSeats: 54 },
];

// Sample bookings for demo
const sampleBookings: Booking[] = [
  {
    id: 'BK001',
    routeId: 'r1',
    routeName: 'Colombo to Kandy',
    date: '2026-01-20',
    seatNumber: 5,
    passengerName: 'John Perera',
    phoneNumber: '+94 77 123 4567',
    status: 'confirmed',
    createdAt: '2026-01-18T10:30:00Z'
  },
  {
    id: 'BK002',
    routeId: 'r1',
    routeName: 'Colombo to Kandy',
    date: '2026-01-20',
    seatNumber: 12,
    passengerName: 'Sarah Fernando',
    phoneNumber: '+94 71 987 6543',
    status: 'confirmed',
    createdAt: '2026-01-18T14:20:00Z'
  },
  {
    id: 'BK003',
    routeId: 'r2',
    routeName: 'Colombo to Galle',
    date: '2026-01-21',
    seatNumber: 3,
    passengerName: 'Mike Silva',
    phoneNumber: '+94 76 555 1234',
    status: 'confirmed',
    createdAt: '2026-01-19T09:15:00Z'
  }
];

export function initializeData() {
  if (!localStorage.getItem(ROUTES_KEY)) {
    localStorage.setItem(ROUTES_KEY, JSON.stringify(defaultRoutes));
  }
  if (!localStorage.getItem(BOOKINGS_KEY)) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(sampleBookings));
  }
  if (!localStorage.getItem(SCHEDULES_KEY)) {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify([]));
  }
}

export function getRoutes(): Route[] {
  const data = localStorage.getItem(ROUTES_KEY);
  return data ? JSON.parse(data) : defaultRoutes;
}

export function addRoute(route: Omit<Route, 'id'>): Route {
  const routes = getRoutes();
  const newRoute: Route = {
    ...route,
    id: `r${Date.now()}`,
  };
  routes.push(newRoute);
  localStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
  return newRoute;
}

export function getBookings(): Booking[] {
  const data = localStorage.getItem(BOOKINGS_KEY);
  return data ? JSON.parse(data) : [];
}

export function addBooking(booking: Omit<Booking, 'id' | 'createdAt'>): Booking {
  const bookings = getBookings();
  const newBooking: Booking = {
    ...booking,
    id: `BK${String(bookings.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
  };
  bookings.push(newBooking);
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  return newBooking;
}

export function updateBookingStatus(bookingId: string, status: 'confirmed' | 'cancelled'): void {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index !== -1) {
    bookings[index].status = status;
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }
}

export function getBookedSeats(routeId: string, date: string): number[] {
  const bookings = getBookings();
  return bookings
    .filter(b => b.routeId === routeId && b.date === date && b.status === 'confirmed')
    .map(b => b.seatNumber);
}

export function isSeatAvailable(routeId: string, date: string, seatNumber: number): boolean {
  const bookedSeats = getBookedSeats(routeId, date);
  return !bookedSeats.includes(seatNumber);
}

export function generateBookingId(): string {
  const bookings = getBookings();
  return `BK${String(bookings.length + 1).padStart(3, '0')}`;
}
