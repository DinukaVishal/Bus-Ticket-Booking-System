-- Add staff access code to owner_buses table
ALTER TABLE public.owner_buses
ADD COLUMN IF NOT EXISTS staff_access_code TEXT UNIQUE;

-- Generate unique codes for existing buses
UPDATE public.owner_buses
SET staff_access_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
WHERE staff_access_code IS NULL;

-- Make the column NOT NULL after populating existing records
ALTER TABLE public.owner_buses
ALTER COLUMN staff_access_code SET NOT NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_owner_buses_staff_access_code ON public.owner_buses(staff_access_code);