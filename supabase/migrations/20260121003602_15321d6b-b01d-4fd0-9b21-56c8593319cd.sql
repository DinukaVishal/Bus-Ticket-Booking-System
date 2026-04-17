-- Add public read access for seat availability (users need to see which seats are booked before booking)
CREATE POLICY "Anyone can view booked seats for availability"
ON public.bookings FOR SELECT
USING (true);