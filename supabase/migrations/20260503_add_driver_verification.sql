-- Add is_approved column to driver_buses table
ALTER TABLE public.driver_buses ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE public.driver_buses ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.driver_buses ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE;

-- Add is_verified column to driver_profiles table (if not exists)
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE;