-- Create a secure RPC for staff access code login
-- This allows anonymous staff access using only the staff access code,
-- without requiring an owner auth session.

CREATE OR REPLACE FUNCTION public.get_owner_bus_by_staff_access_code(
  _staff_access_code TEXT
)
RETURNS TABLE (
  id UUID,
  bus_owner_id UUID,
  bus_number TEXT,
  bus_type TEXT,
  total_seats INTEGER,
  registration_number TEXT,
  insurance_expiry DATE,
  fitness_certificate_expiry DATE,
  approval_status TEXT,
  approved_by UUID,
  approval_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  staff_access_code TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    bus_owner_id,
    bus_number,
    bus_type,
    total_seats,
    registration_number,
    insurance_expiry,
    fitness_certificate_expiry,
    approval_status,
    approved_by,
    approval_date,
    is_active,
    created_at,
    updated_at,
    staff_access_code
  FROM public.owner_buses
  WHERE staff_access_code = upper(_staff_access_code)
    AND approval_status = 'approved'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_owner_bus_by_staff_access_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_owner_bus_by_staff_access_code(TEXT) TO authenticated;
