-- Create routes table
CREATE TABLE public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
  route_name TEXT NOT NULL,
  date DATE NOT NULL,
  seat_number INTEGER NOT NULL,
  passenger_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(route_id, date, seat_number)
);

-- Enable Row Level Security (public access for this demo app)
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to routes
CREATE POLICY "Anyone can view routes"
ON public.routes FOR SELECT
USING (true);

-- Allow public read access to bookings
CREATE POLICY "Anyone can view bookings"
ON public.bookings FOR SELECT
USING (true);

-- Allow public insert for bookings (for demo purposes)
CREATE POLICY "Anyone can create bookings"
ON public.bookings FOR INSERT
WITH CHECK (true);

-- Allow public update for bookings (for status changes)
CREATE POLICY "Anyone can update bookings"
ON public.bookings FOR UPDATE
USING (true);

-- Allow admin insert for routes
CREATE POLICY "Anyone can create routes"
ON public.routes FOR INSERT
WITH CHECK (true);

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Insert default routes
INSERT INTO public.routes (name, from_city, to_city, departure_time, price) VALUES
  ('Colombo to Kandy', 'Colombo', 'Kandy', '08:00 AM', 850),
  ('Colombo to Galle', 'Colombo', 'Galle', '09:30 AM', 650),
  ('Kandy to Jaffna', 'Kandy', 'Jaffna', '06:00 AM', 1500),
  ('Colombo to Negombo', 'Colombo', 'Negombo', '07:00 AM', 350),
  ('Galle to Matara', 'Galle', 'Matara', '10:00 AM', 250);