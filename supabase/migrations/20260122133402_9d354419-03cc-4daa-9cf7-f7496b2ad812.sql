-- Add bus_type column to routes table
ALTER TABLE public.routes 
ADD COLUMN bus_type text NOT NULL DEFAULT 'normal' CHECK (bus_type IN ('ac', 'normal'));

-- Add total_seats column to routes table (A/C buses typically have fewer seats)
ALTER TABLE public.routes 
ADD COLUMN total_seats integer NOT NULL DEFAULT 40;

-- Update existing routes with varied bus types
UPDATE public.routes SET bus_type = 'ac', total_seats = 32 WHERE name LIKE '%Kandy%';
UPDATE public.routes SET bus_type = 'normal', total_seats = 54 WHERE name LIKE '%Galle%';
UPDATE public.routes SET bus_type = 'ac', total_seats = 32 WHERE name LIKE '%Jaffna%';