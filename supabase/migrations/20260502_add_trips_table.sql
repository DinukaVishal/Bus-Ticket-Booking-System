-- Create trips table to support multiple trips per route
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT,
  price INTEGER NOT NULL,
  bus_number TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  conductor_name TEXT,
  conductor_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trips table
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Allow public select access for trips
CREATE POLICY "Anyone can view trips"
ON public.trips FOR SELECT
USING (true);

-- Insert example trips for existing seeded routes
INSERT INTO public.trips (route_id, departure_time, arrival_time, price, bus_number, driver_name, driver_phone, conductor_name, conductor_phone)
VALUES
  ((SELECT id FROM public.routes WHERE name = 'Colombo to Kandy'), '08:00 AM', '12:30 PM', 850, 'KA-3456', 'Nimal Perera', '+94771234567', 'Saman Silva', '+94771234568'),
  ((SELECT id FROM public.routes WHERE name = 'Colombo to Kandy'), '03:00 PM', '07:30 PM', 900, 'KA-9932', 'Amal Fernando', '+94771234569', 'Kamal Perera', '+94771234570'),
  ((SELECT id FROM public.routes WHERE name = 'Colombo to Galle'), '09:30 AM', '12:15 PM', 650, 'GL-2211', 'Rohan Silva', '+94771234571', 'Malith Jayasena', '+94771234572'),
  ((SELECT id FROM public.routes WHERE name = 'Colombo to Galle'), '02:30 PM', '05:15 PM', 680, 'GL-7765', 'Lakshan Dias', '+94771234573', 'Tharindu Senanayake', '+94771234574'),
  ((SELECT id FROM public.routes WHERE name = 'Kandy to Jaffna'), '06:00 AM', '06:00 PM', 1500, 'JF-1023', 'Sunil Perera', '+94771234575', 'Ruwan Kumar', '+94771234576'),
  ((SELECT id FROM public.routes WHERE name = 'Kandy to Jaffna'), '08:00 PM', '08:00 AM', 1600, 'JF-8877', 'Nadeesha Silva', '+94771234577', 'Dilshan Ranaweera', '+94771234578'),
  ((SELECT id FROM public.routes WHERE name = 'Colombo to Negombo'), '07:00 AM', '08:15 AM', 350, 'NE-5544', 'Chintha Perera', '+94771234579', 'Mihiri Fernando', '+94771234580'),
  ((SELECT id FROM public.routes WHERE name = 'Colombo to Negombo'), '01:00 PM', '02:15 PM', 360, 'NE-2210', 'Kasun Jayawardena', '+94771234581', 'Hirantha Silva', '+94771234582'),
  ((SELECT id FROM public.routes WHERE name = 'Galle to Matara'), '10:00 AM', '11:00 AM', 250, 'MT-0055', 'Pradeep Singh', '+94771234583', 'Kumara Perera', '+94771234584'),
  ((SELECT id FROM public.routes WHERE name = 'Galle to Matara'), '04:00 PM', '05:00 PM', 260, 'MT-7788', 'Ravindra Jayasuriya', '+94771234585', 'Suresh Fernando', '+94771234586');

-- Add trip_id column to bookings table
ALTER TABLE public.bookings ADD COLUMN trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE;

-- Add user_id column if it doesn't exist (for tracking which user made the booking)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update the unique constraint to include trip_id instead of just route_id
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_route_id_date_seat_number_key;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_trip_id_date_seat_number_key UNIQUE(trip_id, date, seat_number);

-- Create an index on trip_id for faster lookups
CREATE INDEX idx_trips_route_id ON public.trips(route_id);
CREATE INDEX idx_bookings_trip_id ON public.bookings(trip_id);
CREATE INDEX idx_bookings_date ON public.bookings(date);

-- Update the RPC function to use trip_id instead of route_id
DROP FUNCTION IF EXISTS public.get_booked_seats(UUID, DATE);

CREATE OR REPLACE FUNCTION public.get_booked_seats(
  _trip_id UUID,
  _date DATE
)
RETURNS TABLE(seat_number INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT seat_number
  FROM public.bookings
  WHERE trip_id = _trip_id
    AND date = _date
    AND status = 'confirmed'
$$;

-- Grant execute to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_booked_seats(UUID, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_booked_seats(UUID, DATE) TO authenticated;
