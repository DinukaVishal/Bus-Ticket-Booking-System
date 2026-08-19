-- =====================================================================
-- Drivers & Crew Management System
-- Consolidated migration for:
--   drivers, crew_members, bus_assignments, crew_attendance
-- Includes FKs, indexes, constraints, RLS policies and RPC functions.
--
-- Security model:
--   Admin    -> full CRUD access on all records
--   Bus Owner-> manage ONLY their own records (owner_id = auth.uid())
--   Staff    -> read-only access (is_staff check)
--   Passenger-> no access (frontend route guards + RLS deny)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Add 'staff' role to app_role enum (if not present)
--    NOTE: value added inside a DO block so it can be referenced safely
--    by the is_staff() helper (which compares role::text) in this file.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'staff'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'staff';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1. drivers table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drivers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  nic                 TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT,
  address             TEXT,
  license_number      TEXT NOT NULL,
  license_expiry_date DATE NOT NULL,
  date_of_birth       DATE,
  emergency_contact   TEXT,
  status              TEXT NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available', 'assigned', 'on_leave', 'inactive')),
  image_url           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT drivers_nic_unique UNIQUE (nic),
  CONSTRAINT drivers_license_unique UNIQUE (license_number)
);

-- ---------------------------------------------------------------------
-- 2. crew_members table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crew_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  nic               TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  address           TEXT,
  emergency_contact TEXT,
  crew_role         TEXT NOT NULL CHECK (crew_role IN ('conductor', 'inspector', 'assistant')),
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crew_members_nic_unique UNIQUE (nic)
);

-- ---------------------------------------------------------------------
-- 3. bus_assignments table
--    schedule_id references public.trips (a trip is a schedule entry:
--    route + departure_time + price).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bus_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bus_id        UUID NOT NULL REFERENCES public.owner_buses(id) ON DELETE CASCADE,
  route_id      UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  schedule_id   UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  driver_id     UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  crew_id       UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent a driver / crew member from having more than one ACTIVE assignment
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_assignment_driver
  ON public.bus_assignments (driver_id)
  WHERE status = 'active' AND driver_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_assignment_crew
  ON public.bus_assignments (crew_id)
  WHERE status = 'active' AND crew_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. crew_attendance table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crew_attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crew_id    UUID NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  status     TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crew_attendance_unique_day UNIQUE (crew_id, date)
);

-- ---------------------------------------------------------------------
-- 5. Indexes for performance
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_drivers_owner_id       ON public.drivers (owner_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status         ON public.drivers (status);
CREATE INDEX IF NOT EXISTS idx_drivers_nic            ON public.drivers (nic);
CREATE INDEX IF NOT EXISTS idx_crew_members_owner_id  ON public.crew_members (owner_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_role      ON public.crew_members (crew_role);
CREATE INDEX IF NOT EXISTS idx_crew_members_nic       ON public.crew_members (nic);
CREATE INDEX IF NOT EXISTS idx_assignments_owner_id   ON public.bus_assignments (owner_id);
CREATE INDEX IF NOT EXISTS idx_assignments_bus_id     ON public.bus_assignments (bus_id);
CREATE INDEX IF NOT EXISTS idx_assignments_route_id   ON public.bus_assignments (route_id);
CREATE INDEX IF NOT EXISTS idx_assignments_schedule_id ON public.bus_assignments (schedule_id);
CREATE INDEX IF NOT EXISTS idx_assignments_driver_id  ON public.bus_assignments (driver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_crew_id    ON public.bus_assignments (crew_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status     ON public.bus_assignments (status);
CREATE INDEX IF NOT EXISTS idx_attendance_crew_id     ON public.crew_attendance (crew_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON public.crew_attendance (date);

-- ---------------------------------------------------------------------
-- 6. Enable Row Level Security
-- ---------------------------------------------------------------------
ALTER TABLE public.drivers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_attendance ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 7. is_staff helper (compares role::text to avoid enum transaction
--    pitfalls when the 'staff' value is added in the same migration).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'staff'
  );
$$;

-- ---------------------------------------------------------------------
-- 8. RLS Policies
-- ---------------------------------------------------------------------

-- ============ drivers ============
DROP POLICY IF EXISTS "drivers_select_policy"    ON public.drivers;
DROP POLICY IF EXISTS "drivers_owner_all_policy" ON public.drivers;
DROP POLICY IF EXISTS "drivers_admin_all_policy" ON public.drivers;

CREATE POLICY "drivers_select_policy"
  ON public.drivers FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_staff(auth.uid())
  );

CREATE POLICY "drivers_owner_all_policy"
  ON public.drivers FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "drivers_admin_all_policy"
  ON public.drivers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ crew_members ============
DROP POLICY IF EXISTS "crew_members_select_policy"    ON public.crew_members;
DROP POLICY IF EXISTS "crew_members_owner_all_policy" ON public.crew_members;
DROP POLICY IF EXISTS "crew_members_admin_all_policy" ON public.crew_members;

CREATE POLICY "crew_members_select_policy"
  ON public.crew_members FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_staff(auth.uid())
  );

CREATE POLICY "crew_members_owner_all_policy"
  ON public.crew_members FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "crew_members_admin_all_policy"
  ON public.crew_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ bus_assignments ============
DROP POLICY IF EXISTS "assignments_select_policy"    ON public.bus_assignments;
DROP POLICY IF EXISTS "assignments_owner_all_policy" ON public.bus_assignments;
DROP POLICY IF EXISTS "assignments_admin_all_policy" ON public.bus_assignments;

CREATE POLICY "assignments_select_policy"
  ON public.bus_assignments FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_staff(auth.uid())
  );

CREATE POLICY "assignments_owner_all_policy"
  ON public.bus_assignments FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "assignments_admin_all_policy"
  ON public.bus_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ crew_attendance ============
DROP POLICY IF EXISTS "attendance_select_policy"    ON public.crew_attendance;
DROP POLICY IF EXISTS "attendance_owner_all_policy" ON public.crew_attendance;
DROP POLICY IF EXISTS "attendance_admin_all_policy" ON public.crew_attendance;

CREATE POLICY "attendance_select_policy"
  ON public.crew_attendance FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_staff(auth.uid())
  );

CREATE POLICY "attendance_owner_all_policy"
  ON public.crew_attendance FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "attendance_admin_all_policy"
  ON public.crew_attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- 9. RPC functions
-- ---------------------------------------------------------------------

-- 9a. assign_driver_crew
-- Creates an active assignment after validating:
--   - Caller is owner (or admin)
--   - Bus belongs to owner
--   - Route is assigned to that bus (owner_routes)
--   - Driver/crew belong to owner and are not inactive
--   - Driver/crew do not already have an active assignment
CREATE OR REPLACE FUNCTION public.assign_driver_crew(
  _owner_id      UUID,
  _bus_id        UUID,
  _route_id      UUID,
  _schedule_id   UUID,
  _driver_id     UUID,
  _crew_id       UUID,
  _assigned_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assignment_id UUID;
  _driver_status TEXT;
  _crew_status   TEXT;
  _active_count  INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role))
     AND auth.uid() <> _owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to create assignments for this owner.');
  END IF;

  -- Bus ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.owner_buses
    WHERE id = _bus_id AND bus_owner_id = _owner_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bus not found or not owned by this owner.');
  END IF;

  -- Route must be linked to that bus for this owner
  IF NOT EXISTS (
    SELECT 1 FROM public.owner_routes
    WHERE route_id = _route_id
      AND owner_bus_id = _bus_id
      AND bus_owner_id = _owner_id
      AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Route is not assigned to this bus.');
  END IF;

  -- Schedule/trip must belong to the selected route (if provided)
  IF _schedule_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = _schedule_id AND route_id = _route_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Schedule does not belong to the selected route.');
  END IF;

  -- Driver validation
  IF _driver_id IS NOT NULL THEN
    SELECT status INTO _driver_status
    FROM public.drivers
    WHERE id = _driver_id AND owner_id = _owner_id;

    IF _driver_status IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Driver not found or not owned by this owner.');
    END IF;

    IF _driver_status = 'inactive' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot assign an inactive driver.');
    END IF;

    SELECT count(*) INTO _active_count
    FROM public.bus_assignments
    WHERE driver_id = _driver_id AND status = 'active';

    IF _active_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Driver already has an active assignment.');
    END IF;
  END IF;

  -- Crew validation
  IF _crew_id IS NOT NULL THEN
    SELECT status INTO _crew_status
    FROM public.crew_members
    WHERE id = _crew_id AND owner_id = _owner_id;

    IF _crew_status IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Crew member not found or not owned by this owner.');
    END IF;

    IF _crew_status = 'inactive' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot assign an inactive crew member.');
    END IF;

    SELECT count(*) INTO _active_count
    FROM public.bus_assignments
    WHERE crew_id = _crew_id AND status = 'active';

    IF _active_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Crew member already has an active assignment.');
    END IF;
  END IF;

  IF _driver_id IS NULL AND _crew_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'At least one of driver or crew must be selected.');
  END IF;

  -- Create the assignment
  INSERT INTO public.bus_assignments (
    owner_id, bus_id, route_id, schedule_id, driver_id, crew_id, assigned_date, status
  ) VALUES (
    _owner_id, _bus_id, _route_id, _schedule_id, _driver_id, _crew_id, _assigned_date, 'active'
  ) RETURNING id INTO _assignment_id;

  -- Mark driver as assigned
  IF _driver_id IS NOT NULL THEN
    UPDATE public.drivers
    SET status = 'assigned', updated_at = now()
    WHERE id = _driver_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'assignment_id', _assignment_id);
END;
$$;

-- 9b. end_bus_assignment
-- Marks an assignment completed (or cancelled) and frees the driver back
-- to 'available' when no other active assignment exists.
CREATE OR REPLACE FUNCTION public.end_bus_assignment(
  _assignment_id UUID,
  _status TEXT DEFAULT 'completed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id  UUID;
  _driver_id UUID;
  _other_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  SELECT owner_id, driver_id INTO _owner_id, _driver_id
  FROM public.bus_assignments
  WHERE id = _assignment_id;

  IF _owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignment not found.');
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role))
     AND auth.uid() <> _owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to update this assignment.');
  END IF;

  IF _status NOT IN ('completed', 'cancelled') THEN
    _status := 'completed';
  END IF;

  UPDATE public.bus_assignments
  SET status = _status, updated_at = now()
  WHERE id = _assignment_id;

  -- If the driver is no longer on any active assignment, free them up
  IF _driver_id IS NOT NULL THEN
    SELECT count(*) INTO _other_count
    FROM public.bus_assignments
    WHERE driver_id = _driver_id AND status = 'active' AND id <> _assignment_id;

    IF _other_count = 0 THEN
      UPDATE public.drivers
      SET status = 'available', updated_at = now()
      WHERE id = _driver_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'assignment_id', _assignment_id);
END;
$$;

-- 9c. get_crew_dashboard_stats
-- Returns analytics counts scoped to the caller (admins may pass _owner_id).
CREATE OR REPLACE FUNCTION public.get_crew_dashboard_stats(_owner_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_drivers     BIGINT,
  active_drivers    BIGINT,
  available_drivers BIGINT,
  assigned_drivers  BIGINT,
  on_leave_drivers  BIGINT,
  total_crew        BIGINT,
  active_crew       BIGINT,
  assigned_buses    BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    v_owner_id := COALESCE(_owner_id, auth.uid());
  ELSE
    v_owner_id := auth.uid();
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.drivers d WHERE d.owner_id = v_owner_id)                              AS total_drivers,
    (SELECT count(*) FROM public.drivers d WHERE d.owner_id = v_owner_id AND d.status <> 'inactive')   AS active_drivers,
    (SELECT count(*) FROM public.drivers d WHERE d.owner_id = v_owner_id AND d.status = 'available')   AS available_drivers,
    (SELECT count(*) FROM public.drivers d WHERE d.owner_id = v_owner_id AND d.status = 'assigned')    AS assigned_drivers,
    (SELECT count(*) FROM public.drivers d WHERE d.owner_id = v_owner_id AND d.status = 'on_leave')    AS on_leave_drivers,
    (SELECT count(*) FROM public.crew_members c WHERE c.owner_id = v_owner_id)                         AS total_crew,
    (SELECT count(*) FROM public.crew_members c WHERE c.owner_id = v_owner_id AND c.status = 'active') AS active_crew,
    (SELECT count(DISTINCT b.bus_id) FROM public.bus_assignments b
      WHERE b.owner_id = v_owner_id AND b.status = 'active')                                           AS assigned_buses;
END;
$$;

-- 9d. Staff read-only RPCs
-- Staff log in via a bus staff access code (localStorage session) rather than
-- an auth session, so these SECURITY DEFINER functions expose READ-ONLY data
-- for the owner who owns the specified approved bus. Staff have no INSERT /
-- UPDATE / DELETE capabilities through any RPC or table grant.

-- 9d-1. get_staff_drivers_by_owner_bus_id
DROP FUNCTION IF EXISTS public.get_staff_drivers_by_owner_bus_id(UUID);

CREATE OR REPLACE FUNCTION public.get_staff_drivers_by_owner_bus_id(_owner_bus_id UUID)
RETURNS TABLE (
  id                  UUID,
  full_name           TEXT,
  nic                 TEXT,
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  license_number      TEXT,
  license_expiry_date DATE,
  status              TEXT,
  image_url           TEXT,
  created_at          TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.full_name, d.nic, d.phone, d.email, d.address,
         d.license_number, d.license_expiry_date, d.status, d.image_url, d.created_at
  FROM public.drivers d
  WHERE d.owner_id = (
    SELECT bus_owner_id FROM public.owner_buses WHERE id = _owner_bus_id
  )
  ORDER BY d.full_name;
$$;

-- 9d-2. get_staff_crew_by_owner_bus_id
DROP FUNCTION IF EXISTS public.get_staff_crew_by_owner_bus_id(UUID);

CREATE OR REPLACE FUNCTION public.get_staff_crew_by_owner_bus_id(_owner_bus_id UUID)
RETURNS TABLE (
  id                UUID,
  full_name         TEXT,
  nic               TEXT,
  phone             TEXT,
  email             TEXT,
  address           TEXT,
  emergency_contact TEXT,
  crew_role         TEXT,
  status            TEXT,
  created_at        TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.full_name, c.nic, c.phone, c.email, c.address,
         c.emergency_contact, c.crew_role, c.status, c.created_at
  FROM public.crew_members c
  WHERE c.owner_id = (
    SELECT bus_owner_id FROM public.owner_buses WHERE id = _owner_bus_id
  )
  ORDER BY c.full_name;
$$;

-- 9d-3. get_staff_assignments_by_owner_bus_id
DROP FUNCTION IF EXISTS public.get_staff_assignments_by_owner_bus_id(UUID);

CREATE OR REPLACE FUNCTION public.get_staff_assignments_by_owner_bus_id(_owner_bus_id UUID)
RETURNS TABLE (
  id             UUID,
  bus_id         UUID,
  bus_number     TEXT,
  route_id       UUID,
  route_name     TEXT,
  schedule_id    UUID,
  departure_time TEXT,
  driver_id      UUID,
  driver_name    TEXT,
  crew_id        UUID,
  crew_name      TEXT,
  assigned_date  DATE,
  status         TEXT,
  created_at     TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.bus_id,
    ob.bus_number,
    a.route_id,
    r.name AS route_name,
    a.schedule_id,
    t.departure_time,
    a.driver_id,
    d.full_name AS driver_name,
    a.crew_id,
    c.full_name AS crew_name,
    a.assigned_date,
    a.status,
    a.created_at
  FROM public.bus_assignments a
  JOIN public.owner_buses ob  ON ob.id = a.bus_id
  JOIN public.routes r        ON r.id = a.route_id
  LEFT JOIN public.trips t    ON t.id = a.schedule_id
  LEFT JOIN public.drivers d  ON d.id = a.driver_id
  LEFT JOIN public.crew_members c ON c.id = a.crew_id
  WHERE a.owner_id = (
    SELECT bus_owner_id FROM public.owner_buses WHERE id = _owner_bus_id
  )
  ORDER BY a.assigned_date DESC, a.created_at DESC;
$$;

-- ---------------------------------------------------------------------
-- 10. updated_at triggers
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_drivers_updated_at         ON public.drivers;
DROP TRIGGER IF EXISTS update_crew_members_updated_at    ON public.crew_members;
DROP TRIGGER IF EXISTS update_bus_assignments_updated_at ON public.bus_assignments;

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crew_members_updated_at
  BEFORE UPDATE ON public.crew_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bus_assignments_updated_at
  BEFORE UPDATE ON public.bus_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 11. Grants
-- ---------------------------------------------------------------------
GRANT SELECT ON public.drivers, public.crew_members, public.bus_assignments, public.crew_attendance TO authenticated;
GRANT ALL  ON public.drivers, public.crew_members, public.bus_assignments, public.crew_attendance TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_driver_crew(UUID, UUID, UUID, UUID, UUID, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_bus_assignment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crew_dashboard_stats(UUID) TO authenticated;

-- Staff read-only RPCs (also granted to anon so access-code staff sessions
-- can read crew data without an auth session - they only return READ-ONLY data)
GRANT EXECUTE ON FUNCTION public.get_staff_drivers_by_owner_bus_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_staff_drivers_by_owner_bus_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_crew_by_owner_bus_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_staff_crew_by_owner_bus_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_assignments_by_owner_bus_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_staff_assignments_by_owner_bus_id(UUID) TO authenticated;

