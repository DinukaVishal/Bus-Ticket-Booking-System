-- Add via_points column to routes table for storing intermediate stops
ALTER TABLE public.routes 
ADD COLUMN via_points text[] DEFAULT '{}';

-- Add a comment for documentation
COMMENT ON COLUMN public.routes.via_points IS 'Array of city names representing intermediate stops on the route';