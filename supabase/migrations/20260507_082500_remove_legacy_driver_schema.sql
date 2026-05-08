-- Remove legacy driver-only schema and data now that bus owners manage driver/conductor details directly

-- Drop legacy driver profile table
DROP TABLE IF EXISTS public.driver_profiles CASCADE;

-- Drop legacy driver route table
DROP TABLE IF EXISTS public.driver_routes CASCADE;

-- Remove driver role assignments from user_roles
DELETE FROM public.user_roles WHERE role = 'driver';

-- If there are any driver-only roles in app_role enum still present, leave them for compatibility.
-- The user-facing bus owner flow now uses the bus_owner role only.
