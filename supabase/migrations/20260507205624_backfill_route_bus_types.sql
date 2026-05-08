-- Backfill bus types for existing routes based on assigned owner buses
UPDATE public.routes
SET bus_type = owner_buses.bus_type
FROM owner_routes
JOIN owner_buses ON owner_routes.owner_bus_id = owner_buses.id
WHERE routes.id = owner_routes.route_id
AND owner_routes.is_active = true;