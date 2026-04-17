-- Add vehicle details columns to routes table
ALTER TABLE public.routes
ADD COLUMN IF NOT EXISTS bus_number TEXT,
ADD COLUMN IF NOT EXISTS driver_name TEXT,
ADD COLUMN IF NOT EXISTS driver_phone TEXT,
ADD COLUMN IF NOT EXISTS conductor_name TEXT,
ADD COLUMN IF NOT EXISTS conductor_phone TEXT;