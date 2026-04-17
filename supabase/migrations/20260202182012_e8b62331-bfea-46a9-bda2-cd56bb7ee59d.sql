-- Drop the existing check constraint on bus_type
ALTER TABLE public.routes DROP CONSTRAINT IF EXISTS routes_bus_type_check;

-- Update existing 'ac' bus types to 'luxury_ac' for backward compatibility
UPDATE public.routes SET bus_type = 'luxury_ac' WHERE bus_type = 'ac';

-- Add new check constraint with all four bus types
ALTER TABLE public.routes ADD CONSTRAINT routes_bus_type_check 
CHECK (bus_type IN ('rosa', 'luxury_ac', 'super_long', 'normal'));