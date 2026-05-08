-- Add approval_status column to driver_buses table
ALTER TABLE public.driver_buses ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Update existing records: if is_approved is true, set status to 'approved', otherwise 'pending'
UPDATE public.driver_buses SET approval_status = CASE WHEN is_approved = true THEN 'approved' ELSE 'pending' END WHERE approval_status IS NULL;

-- Make approval_status NOT NULL after migration
ALTER TABLE public.driver_buses ALTER COLUMN approval_status SET NOT NULL;