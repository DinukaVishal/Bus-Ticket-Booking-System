
CREATE POLICY "Admins can delete any booking"
ON public.bookings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own bookings"
ON public.bookings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
