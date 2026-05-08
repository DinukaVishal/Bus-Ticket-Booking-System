-- Secure RPC to let staff retrieve trips for a bus without requiring owner auth

CREATE OR REPLACE FUNCTION public.get_staff_trips_by_owner_bus_id(
  _owner_bus_id UUID
)
RETURNS TABLE (
  id UUID,
  route_id UUID,
  departure_time TEXT,
  arrival_time TEXT,
  price INTEGER,
  routes JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.route_id,
    t.departure_time,
    t.arrival_time,
    t.price,
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'from_city', r.from_city,
      'to_city', r.to_city
    ) AS routes
  FROM public.trips t
  JOIN public.routes r ON r.id = t.route_id
  JOIN public.owner_routes orr ON orr.route_id = t.route_id
  WHERE orr.owner_bus_id = _owner_bus_id
    AND orr.is_active = true
    AND t.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_trips_by_owner_bus_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_staff_trips_by_owner_bus_id(UUID) TO authenticated;
