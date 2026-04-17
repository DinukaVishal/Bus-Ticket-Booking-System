-- Allow authenticated users to insert their own admin role (for first-time setup)
-- This is restricted by the setup code check in the application
CREATE POLICY "Users can claim admin role during setup"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);