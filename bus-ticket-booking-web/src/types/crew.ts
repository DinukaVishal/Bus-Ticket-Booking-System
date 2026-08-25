export type DriverStatus = 'available' | 'assigned' | 'on_leave' | 'inactive';
export type CrewRole = 'conductor' | 'inspector' | 'assistant';
export type CrewStatus = 'active' | 'available' | 'assigned' | 'on_leave' | 'inactive';
export type AssignmentStatus = 'active' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface DriverRow {
  id: string;
  owner_id?: string;
  full_name: string;
  nic: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  license_number: string;
  license_expiry_date?: string;
  date_of_birth?: string | null;
  emergency_contact?: string | null;
  status: DriverStatus | string;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  assigned_bus?: string | null;
  bus_id?: string | null;
  bus_number?: string | null;
  source?: 'drivers' | 'bus_drivers' | 'trips';
}

export interface CrewMemberRow {
  id: string;
  owner_id?: string;
  full_name: string;
  nic: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  crew_role: CrewRole | string;
  status: CrewStatus | string;
  created_at?: string;
  updated_at?: string;
  assigned_bus?: string | null;
  bus_id?: string | null;
  bus_number?: string | null;
  source?: 'crew_members' | 'bus_conductors' | 'trips';
}

export interface BusAssignmentRow {
  id: string;
  owner_id: string;
  bus_id: string;
  route_id: string;
  schedule_id?: string | null;
  driver_id?: string | null;
  crew_id?: string | null;
  assigned_date: string;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
  owner_buses?: {
    id: string;
    bus_number: string;
    bus_type: string;
    bus_owner_id: string;
  } | null;
  routes?: {
    id: string;
    name: string;
    from_city: string;
    to_city: string;
  } | null;
  trips?: {
    id: string;
    departure_time: string;
    arrival_time?: string | null;
    price: number;
    bus_number?: string | null;
  } | null;
  drivers?: {
    id: string;
    full_name: string;
    phone: string;
    status: string;
  } | null;
  crew_members?: {
    id: string;
    full_name: string;
    phone: string;
    crew_role: string;
    status: string;
  } | null;
}

export interface CrewAttendanceRow {
  id: string;
  owner_id: string;
  crew_id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
  created_at: string;
  crew_members?: {
    id: string;
    full_name: string;
    phone: string;
    crew_role: string;
  } | null;
}
