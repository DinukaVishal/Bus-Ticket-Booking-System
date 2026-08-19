-- =====================================================================
-- Compliance & Regulatory Management System
-- Consolidated migration for:
--   document_types, compliance_documents, document_versions,
--   document_verifications, compliance_notifications,
--   compliance_audit_logs, required_documents, compliance_scores,
--   inspection_schedules
--
-- Security model:
--   Admin     -> full CRUD on all records
--   Bus Owner -> manage ONLY their own records (owner_id = auth.uid())
--   Staff     -> read-only access (is_staff check)
--   Passenger -> no access (frontend route guards + RLS deny)
--
-- Storage bucket: compliance-documents (private)
--   Folder layout: {owner_id}/{vehicle|driver|crew}/{filename}
--
-- Reuses existing helpers: has_role(), is_staff(), create_notification()
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Ensure 'staff' role exists in app_role enum (idempotent)
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
-- 1. document_types table
--    Category: vehicle | driver | crew
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('vehicle', 'driver', 'crew')),
  code          TEXT NOT NULL,
  description   TEXT,
  required      BOOLEAN NOT NULL DEFAULT true,
  renewal_months INTEGER,          -- suggested renewal interval for scheduling
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, code)
);

-- ---------------------------------------------------------------------
-- 2. compliance_documents table
--    Polymorphic: references a vehicle (owner_buses), driver, or crew.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type_id    UUID NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  entity_type         TEXT NOT NULL CHECK (entity_type IN ('vehicle', 'driver', 'crew')),
  vehicle_id          UUID REFERENCES public.owner_buses(id) ON DELETE CASCADE,
  driver_id           UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  crew_id             UUID REFERENCES public.crew_members(id) ON DELETE CASCADE,
  document_number     TEXT NOT NULL,
  issue_date          DATE,
  expiry_date         DATE,
  issuing_authority   TEXT,
  file_url            TEXT,
  file_path           TEXT,          -- storage path for secure URL generation
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'valid', 'expiring_soon', 'expired', 'rejected')),
  notes               TEXT,
  verified            BOOLEAN NOT NULL DEFAULT false,
  verified_at         TIMESTAMPTZ,
  verified_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_notes  TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT compliance_entity_check CHECK (
    (entity_type = 'vehicle' AND vehicle_id IS NOT NULL AND driver_id IS NULL AND crew_id IS NULL)
    OR (entity_type = 'driver' AND driver_id IS NOT NULL AND vehicle_id IS NULL AND crew_id IS NULL)
    OR (entity_type = 'crew' AND crew_id IS NOT NULL AND vehicle_id IS NULL AND driver_id IS NULL)
  )
);

-- ---------------------------------------------------------------------
-- 3. document_versions table (version history)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
  version          INTEGER NOT NULL DEFAULT 1,
  file_url         TEXT,
  file_path        TEXT,
  uploaded_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);

-- ---------------------------------------------------------------------
-- 4. document_verifications table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_verifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID NOT NULL REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
  verified_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action            TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'resubmission')),
  notes             TEXT,
  verified_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. compliance_notifications table (outbound reminder log)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('expiring', 'expired', 'rejected', 'verified', 'renewal_reminder')),
  message       TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 6. compliance_audit_logs table (audit trail)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  old_values    JSONB,
  new_values    JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 7. required_documents table (per-entity required document types)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.required_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('vehicle', 'driver', 'crew')),
  entity_id         UUID NOT NULL,
  document_type_id  UUID NOT NULL REFERENCES public.document_types(id) ON DELETE CASCADE,
  is_mandatory      BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, document_type_id)
);

-- ---------------------------------------------------------------------
-- 8. compliance_scores table (cached scores)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('vehicle', 'driver', 'crew', 'overall')),
  entity_id     UUID,
  score         NUMERIC(5,2) NOT NULL DEFAULT 0,
  valid_count   INTEGER NOT NULL DEFAULT 0,
  required_count INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, entity_type, entity_id)
);

-- ---------------------------------------------------------------------
-- 9. inspection_schedules table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inspection_schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id     UUID REFERENCES public.owner_buses(id) ON DELETE CASCADE,
  driver_id      UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 10. Indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_doc_types_category        ON public.document_types (category);
CREATE INDEX IF NOT EXISTS idx_cd_owner_id               ON public.compliance_documents (owner_id);
CREATE INDEX IF NOT EXISTS idx_cd_document_type          ON public.compliance_documents (document_type_id);
CREATE INDEX IF NOT EXISTS idx_cd_entity_type            ON public.compliance_documents (entity_type);
CREATE INDEX IF NOT EXISTS idx_cd_vehicle_id             ON public.compliance_documents (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_cd_driver_id              ON public.compliance_documents (driver_id);
CREATE INDEX IF NOT EXISTS idx_cd_crew_id                ON public.compliance_documents (crew_id);
CREATE INDEX IF NOT EXISTS idx_cd_status                 ON public.compliance_documents (status);
CREATE INDEX IF NOT EXISTS idx_cd_expiry_date            ON public.compliance_documents (expiry_date);
CREATE INDEX IF NOT EXISTS idx_cd_verified               ON public.compliance_documents (verified);
CREATE INDEX IF NOT EXISTS idx_dv_document_id            ON public.document_versions (document_id);
CREATE INDEX IF NOT EXISTS idx_verif_document_id         ON public.document_verifications (document_id);
CREATE INDEX IF NOT EXISTS idx_cn_document_id            ON public.compliance_notifications (document_id);
CREATE INDEX IF NOT EXISTS idx_cn_recipient_id           ON public.compliance_notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_audit_document_id         ON public.compliance_audit_logs (document_id);
CREATE INDEX IF NOT EXISTS idx_req_entity                ON public.required_documents (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cs_owner_id               ON public.compliance_scores (owner_id);
CREATE INDEX IF NOT EXISTS idx_inspect_owner             ON public.inspection_schedules (owner_id);
CREATE INDEX IF NOT EXISTS idx_inspect_date              ON public.inspection_schedules (scheduled_date);

-- ---------------------------------------------------------------------
-- 11. Seed default document types
-- ---------------------------------------------------------------------
INSERT INTO public.document_types (name, category, code, description, required, renewal_months) VALUES
  -- Vehicle
  ('Vehicle Registration',    'vehicle', 'vehicle_registration',    'Registration of the bus with the DMT', true, 12),
  ('Revenue License',         'vehicle', 'revenue_license',         'Annual revenue license for operation', true, 12),
  ('Insurance Certificate',   'vehicle', 'insurance',              'Third-party / comprehensive insurance', true, 12),
  ('Emission Test Certificate','vehicle', 'emission_test',          'Valid emission test certificate', true, 12),
  ('Passenger Transport Permit','vehicle', 'passenger_transport_permit','Permit to carry passengers', true, 12),
  ('Route Permit',            'vehicle', 'route_permit',            'Permit for the assigned route', true, 12),
  ('Road Worthiness Certificate','vehicle', 'road_worthiness',      'Roadworthiness certificate', true, 12),
  ('Fitness Certificate',     'vehicle', 'fitness',                 'Fitness certificate for operation', true, 12),
  ('Provincial Authority Permit','vehicle', 'provincial_permit',     'Provincial authority operating permit', true, 12),
  -- Driver
  ('Driving License',         'driver', 'driving_license',          'Valid driving license', true, 60),
  ('Heavy Vehicle License',   'driver', 'heavy_vehicle_license',    'Heavy vehicle endorsement', true, 60),
  ('PSV License',             'driver', 'psv_license',              'Public Service Vehicle license', true, 12),
  ('Medical Certificate',     'driver', 'medical_certificate',      'Medical fitness certificate', true, 12),
  ('Police Clearance',        'driver', 'police_clearance',         'Police clearance certificate', true, 24),
  ('Training Certificate',    'driver', 'training_certificate',     'Driver training certificate', true, 24),
  ('Employment Contract',     'driver', 'employment_contract',      'Employment agreement', true, NULL),
  -- Crew
  ('ID Card',                 'crew', 'id_card',                    'National identity card', true, NULL),
  ('Medical Certificate',     'crew', 'crew_medical_certificate',   'Medical fitness certificate', true, 12),
  ('Employment Agreement',    'crew', 'crew_employment_agreement',  'Employment agreement', true, NULL),
  ('Training Certificate',    'crew', 'crew_training_certificate',  'Crew training certificate', true, 24),
  ('Police Clearance',        'crew', 'crew_police_clearance',      'Police clearance certificate', true, 24),
  ('Emergency Contact',       'crew', 'crew_emergency_contact',     'Emergency contact information', true, NULL)
ON CONFLICT (category, code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 12. Enable Row Level Security
-- ---------------------------------------------------------------------
ALTER TABLE public.document_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.required_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_schedules     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 13. RLS Policies
-- ---------------------------------------------------------------------

-- ============ document_types (read-only to all authenticated, admin manages) ============
DROP POLICY IF EXISTS "doc_types_select"     ON public.document_types;
DROP POLICY IF EXISTS "doc_types_admin_all"  ON public.document_types;

CREATE POLICY "doc_types_select"
  ON public.document_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "doc_types_admin_all"
  ON public.document_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ compliance_documents ============
DROP POLICY IF EXISTS "cd_select_policy"    ON public.compliance_documents;
DROP POLICY IF EXISTS "cd_owner_all_policy" ON public.compliance_documents;
DROP POLICY IF EXISTS "cd_admin_all_policy" ON public.compliance_documents;

CREATE POLICY "cd_select_policy"
  ON public.compliance_documents FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_staff(auth.uid())
  );

CREATE POLICY "cd_owner_all_policy"
  ON public.compliance_documents FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "cd_admin_all_policy"
  ON public.compliance_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ document_versions ============
DROP POLICY IF EXISTS "dv_select_policy"    ON public.document_versions;
DROP POLICY IF EXISTS "dv_owner_all_policy" ON public.document_versions;
DROP POLICY IF EXISTS "dv_admin_all_policy" ON public.document_versions;

CREATE POLICY "dv_select_policy"
  ON public.document_versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.compliance_documents cd
      WHERE cd.id = document_id
        AND (cd.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.is_staff(auth.uid()))
    )
  );

CREATE POLICY "dv_owner_all_policy"
  ON public.document_versions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.compliance_documents cd
      WHERE cd.id = document_id AND cd.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.compliance_documents cd
      WHERE cd.id = document_id AND cd.owner_id = auth.uid()
    )
  );

CREATE POLICY "dv_admin_all_policy"
  ON public.document_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ document_verifications ============
DROP POLICY IF EXISTS "verif_select_policy"    ON public.document_verifications;
DROP POLICY IF EXISTS "verif_owner_select_policy" ON public.document_verifications;
DROP POLICY IF EXISTS "verif_admin_all_policy" ON public.document_verifications;

CREATE POLICY "verif_select_policy"
  ON public.document_verifications FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_staff(auth.uid())
  );

CREATE POLICY "verif_owner_select_policy"
  ON public.document_verifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.compliance_documents cd
      WHERE cd.id = document_id AND cd.owner_id = auth.uid()
    )
  );

CREATE POLICY "verif_admin_all_policy"
  ON public.document_verifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ compliance_notifications ============
DROP POLICY IF EXISTS "cn_select_policy" ON public.compliance_notifications;
DROP POLICY IF EXISTS "cn_owner_select_policy" ON public.compliance_notifications;
DROP POLICY IF EXISTS "cn_admin_all_policy" ON public.compliance_notifications;

CREATE POLICY "cn_select_policy"
  ON public.compliance_notifications FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "cn_owner_select_policy"
  ON public.compliance_notifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.compliance_documents cd
      WHERE cd.id = document_id AND cd.owner_id = auth.uid()
    )
  );

CREATE POLICY "cn_admin_all_policy"
  ON public.compliance_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ compliance_audit_logs ============
DROP POLICY IF EXISTS "audit_select_policy"    ON public.compliance_audit_logs;
DROP POLICY IF EXISTS "audit_owner_select_policy" ON public.compliance_audit_logs;
DROP POLICY IF EXISTS "audit_admin_all_policy" ON public.compliance_audit_logs;

CREATE POLICY "audit_select_policy"
  ON public.compliance_audit_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_staff(auth.uid())
  );

CREATE POLICY "audit_owner_select_policy"
  ON public.compliance_audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.compliance_documents cd
      WHERE cd.id = document_id AND cd.owner_id = auth.uid()
    )
  );

CREATE POLICY "audit_admin_all_policy"
  ON public.compliance_audit_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ required_documents ============
DROP POLICY IF EXISTS "rd_select_policy"    ON public.required_documents;
DROP POLICY IF EXISTS "rd_owner_all_policy" ON public.required_documents;
DROP POLICY IF EXISTS "rd_admin_all_policy" ON public.required_documents;

CREATE POLICY "rd_select_policy"
  ON public.required_documents FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_staff(auth.uid())
  );

CREATE POLICY "rd_owner_all_policy"
  ON public.required_documents FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "rd_admin_all_policy"
  ON public.required_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ compliance_scores ============
DROP POLICY IF EXISTS "cs_select_policy"    ON public.compliance_scores;
DROP POLICY IF EXISTS "cs_owner_select_policy" ON public.compliance_scores;
DROP POLICY IF EXISTS "cs_admin_all_policy" ON public.compliance_scores;

CREATE POLICY "cs_select_policy"
  ON public.compliance_scores FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_staff(auth.uid())
  );

CREATE POLICY "cs_owner_select_policy"
  ON public.compliance_scores FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "cs_admin_all_policy"
  ON public.compliance_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ inspection_schedules ============
DROP POLICY IF EXISTS "inspect_select_policy"    ON public.inspection_schedules;
DROP POLICY IF EXISTS "inspect_owner_all_policy" ON public.inspection_schedules;
DROP POLICY IF EXISTS "inspect_admin_all_policy" ON public.inspection_schedules;

CREATE POLICY "inspect_select_policy"
  ON public.inspection_schedules FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_staff(auth.uid())
  );

CREATE POLICY "inspect_owner_all_policy"
  ON public.inspection_schedules FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "inspect_admin_all_policy"
  ON public.inspection_schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- 14. Helper: compute_status_from_expiry
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_document_status(_expiry_date DATE)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN _expiry_date IS NULL THEN 'pending'
    WHEN _expiry_date < CURRENT_DATE THEN 'expired'
    WHEN _expiry_date <= CURRENT_DATE + 30 THEN 'expiring_soon'
    ELSE 'valid'
  END;
$$;

-- ---------------------------------------------------------------------
-- 15. Triggers
-- ---------------------------------------------------------------------

-- 15a. Auto-compute status on insert/update based on expiry date
CREATE OR REPLACE FUNCTION public.handle_document_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-compute when not explicitly rejected/pending
  IF NEW.status IS DISTINCT FROM 'rejected' AND NEW.status IS DISTINCT FROM 'pending' THEN
    NEW.status := public.compute_document_status(NEW.expiry_date);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 15b. Audit log trigger
CREATE OR REPLACE FUNCTION public.log_compliance_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
BEGIN
  v_old := to_jsonb(OLD);
  v_new := to_jsonb(NEW);
  -- Strip raw fields we don't want to track verbatim
  v_old := v_old - 'updated_at' - 'created_at';
  v_new := v_new - 'updated_at' - 'created_at';

  IF v_old IS DISTINCT FROM v_new THEN
    INSERT INTO public.compliance_audit_logs (document_id, actor_id, action, old_values, new_values)
    VALUES (NEW.id, auth.uid(), 'updated', v_old, v_new);
  END IF;
  RETURN NEW;
END;
$$;

-- 15c. Version history on upload (INSERT into document_versions)
CREATE OR REPLACE FUNCTION public.log_document_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  IF NEW.file_path IS NOT NULL OR NEW.file_url IS NOT NULL THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next
    FROM public.document_versions WHERE document_id = NEW.id;
    INSERT INTO public.document_versions (document_id, version, file_url, file_path, uploaded_by, notes)
    VALUES (NEW.id, v_next, NEW.file_url, NEW.file_path, auth.uid(), NEW.notes);
  END IF;
  RETURN NEW;
END;
$$;

-- 15d. Notification on verification (approved/rejected)
CREATE OR REPLACE FUNCTION public.notify_document_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.compliance_documents%ROWTYPE;
  v_owner_id UUID;
BEGIN
  SELECT * INTO v_doc FROM public.compliance_documents WHERE id = NEW.document_id;
  IF v_doc IS NULL THEN
    RETURN NEW;
  END IF;
  v_owner_id := v_doc.owner_id;

  IF NEW.action = 'approved' THEN
    PERFORM public.create_notification(
      v_owner_id,
      'Document Approved',
      'Your compliance document ' || v_doc.document_number || ' has been approved.',
      'compliance',
      'compliance_document',
      v_doc.id,
      '/owner/compliance'
    );
  ELSIF NEW.action = 'rejected' THEN
    PERFORM public.create_notification(
      v_owner_id,
      'Document Rejected',
      'Your compliance document ' || v_doc.document_number || ' was rejected' ||
        CASE WHEN NEW.notes IS NOT NULL THEN ' - ' || NEW.notes ELSE '' END,
      'compliance',
      'compliance_document',
      v_doc.id,
      '/owner/compliance'
    );
  ELSIF NEW.action = 'resubmission' THEN
    PERFORM public.create_notification(
      v_owner_id,
      'Document Resubmission Requested',
      'Please resubmit ' || v_doc.document_number || '. ' || COALESCE(NEW.notes, ''),
      'compliance',
      'compliance_document',
      v_doc.id,
      '/owner/compliance'
    );
  END IF;

  INSERT INTO public.compliance_notifications (document_id, recipient_id, type, message, notification_id)
  SELECT v_doc.id, v_owner_id, NEW.action, COALESCE(NEW.notes, ''), NULL;

  RETURN NEW;
END;
$$;

-- 15e. Notification on status change (expiring/expired) - handled by RPC for bulk, but also on direct update
CREATE OR REPLACE FUNCTION public.notify_document_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'expired' THEN
      v_type := 'expired';
      PERFORM public.create_notification(
        NEW.owner_id,
        'Compliance Document Expired',
        'Document ' || NEW.document_number || ' has expired.',
        'compliance', 'compliance_document', NEW.id, '/owner/compliance'
      );
    ELSIF NEW.status = 'expiring_soon' THEN
      v_type := 'expiring';
      PERFORM public.create_notification(
        NEW.owner_id,
        'Compliance Document Expiring Soon',
        'Document ' || NEW.document_number || ' expires on ' || NEW.expiry_date || '.',
        'compliance', 'compliance_document', NEW.id, '/owner/compliance'
      );
    END IF;

    INSERT INTO public.compliance_notifications (document_id, recipient_id, type, message, notification_id)
    SELECT NEW.id, NEW.owner_id, v_type, 'Status changed to ' || NEW.status, NULL
    WHERE v_type IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers (idempotent)
DROP TRIGGER IF EXISTS trg_cd_status ON public.compliance_documents;
DROP TRIGGER IF EXISTS trg_cd_audit ON public.compliance_documents;
DROP TRIGGER IF EXISTS trg_cd_version ON public.compliance_documents;
DROP TRIGGER IF EXISTS trg_cd_status_notify ON public.compliance_documents;
DROP TRIGGER IF EXISTS trg_verif_notify ON public.document_verifications;

CREATE TRIGGER trg_cd_status
  BEFORE INSERT OR UPDATE ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_document_status();

CREATE TRIGGER trg_cd_audit
  AFTER UPDATE ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_compliance_audit();

CREATE TRIGGER trg_cd_version
  AFTER INSERT ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_document_version();

CREATE TRIGGER trg_cd_status_notify
  AFTER UPDATE OF status ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.notify_document_status_change();

CREATE TRIGGER trg_verif_notify
  AFTER INSERT ON public.document_verifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_document_verification();

-- ---------------------------------------------------------------------
-- 16. RPC: calculate_compliance_score
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_compliance_score(_owner_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_total BIGINT;
  v_valid BIGINT;
  v_score NUMERIC(5,2);
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role) AND _owner_id IS NOT NULL THEN
    v_owner_id := _owner_id;
  ELSE
    v_owner_id := auth.uid();
  END IF;

  SELECT count(*) INTO v_total
  FROM public.compliance_documents
  WHERE owner_id = v_owner_id;

  SELECT count(*) INTO v_valid
  FROM public.compliance_documents
  WHERE owner_id = v_owner_id AND status = 'valid';

  v_score := CASE WHEN v_total = 0 THEN 0 ELSE ROUND((v_valid::numeric / v_total::numeric) * 100, 2) END;

  INSERT INTO public.compliance_scores (owner_id, entity_type, entity_id, score, valid_count, required_count, calculated_at)
  VALUES (v_owner_id, 'overall', NULL, v_score, v_valid, v_total, now())
  ON CONFLICT (owner_id, entity_type, entity_id)
  DO UPDATE SET score = EXCLUDED.score, valid_count = EXCLUDED.valid_count,
                required_count = EXCLUDED.required_count, calculated_at = now();

  v_result := jsonb_build_object(
    'owner_id', v_owner_id,
    'score', v_score,
    'valid_count', v_valid,
    'required_count', v_total
  );

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- 17. RPC: verify_document
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_document(
  _document_id UUID,
  _action TEXT,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.compliance_documents%ROWTYPE;
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can verify documents.');
  END IF;

  IF _action NOT IN ('approved', 'rejected', 'resubmission') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action.');
  END IF;

  SELECT * INTO v_doc FROM public.compliance_documents WHERE id = _document_id;
  IF v_doc IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found.');
  END IF;

  CASE _action
    WHEN 'approved' THEN v_status := public.compute_document_status(v_doc.expiry_date);
    WHEN 'rejected' THEN v_status := 'rejected';
    WHEN 'resubmission' THEN v_status := 'pending';
  END CASE;

  UPDATE public.compliance_documents
  SET status = v_status,
      verified = (_action = 'approved'),
      verified_at = now(),
      verified_by = auth.uid(),
      verification_notes = COALESCE(_notes, verification_notes),
      updated_at = now()
  WHERE id = _document_id;

  INSERT INTO public.document_verifications (document_id, verified_by, action, notes)
  VALUES (_document_id, auth.uid(), _action, _notes);

  RETURN jsonb_build_object('success', true, 'document_id', _document_id, 'status', v_status);
END;
$$;

-- ---------------------------------------------------------------------
-- 18. RPC: get_expiring_documents
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_expiring_documents(_days INTEGER DEFAULT 90, _owner_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  document_number TEXT,
  document_type TEXT,
  category TEXT,
  entity_type TEXT,
  vehicle_id UUID,
  driver_id UUID,
  crew_id UUID,
  expiry_date DATE,
  status TEXT,
  owner_id UUID,
  days_remaining INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) AND _owner_id IS NOT NULL THEN
    v_owner_id := _owner_id;
  ELSE
    v_owner_id := auth.uid();
  END IF;

  RETURN QUERY
  SELECT cd.id, cd.document_number, dt.name, dt.category, cd.entity_type,
         cd.vehicle_id, cd.driver_id, cd.crew_id, cd.expiry_date, cd.status, cd.owner_id,
         (cd.expiry_date - CURRENT_DATE) AS days_remaining
  FROM public.compliance_documents cd
  JOIN public.document_types dt ON dt.id = cd.document_type_id
  WHERE cd.owner_id = v_owner_id
    AND cd.expiry_date IS NOT NULL
    AND cd.expiry_date <= CURRENT_DATE + _days
  ORDER BY cd.expiry_date ASC;
END;
$$;

-- ---------------------------------------------------------------------
-- 19. RPC: get_compliance_dashboard
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_compliance_dashboard(_owner_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role) AND _owner_id IS NOT NULL THEN
    v_owner_id := _owner_id;
  ELSE
    v_owner_id := auth.uid();
  END IF;

  SELECT jsonb_build_object(
    'total_documents',
      (SELECT count(*) FROM public.compliance_documents WHERE owner_id = v_owner_id),
    'valid_documents',
      (SELECT count(*) FROM public.compliance_documents WHERE owner_id = v_owner_id AND status = 'valid'),
    'expired_documents',
      (SELECT count(*) FROM public.compliance_documents WHERE owner_id = v_owner_id AND status = 'expired'),
    'expiring_30',
      (SELECT count(*) FROM public.compliance_documents WHERE owner_id = v_owner_id AND status = 'expiring_soon'),
    'pending_verification',
      (SELECT count(*) FROM public.compliance_documents WHERE owner_id = v_owner_id AND status = 'pending'),
    'rejected_documents',
      (SELECT count(*) FROM public.compliance_documents WHERE owner_id = v_owner_id AND status = 'rejected'),
    'by_status',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', status, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
        FROM (SELECT status, count(*) cnt FROM public.compliance_documents WHERE owner_id = v_owner_id GROUP BY status) s),
    'by_document_type',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', dt.name, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
        FROM (SELECT document_type_id, count(*) cnt FROM public.compliance_documents WHERE owner_id = v_owner_id GROUP BY document_type_id) cd
        JOIN public.document_types dt ON dt.id = cd.document_type_id),
    'monthly_expirations',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('month', month, 'count', cnt) ORDER BY month), '[]'::jsonb)
        FROM (SELECT to_char(expiry_date, 'YYYY-MM') month, count(*) cnt
              FROM public.compliance_documents
              WHERE owner_id = v_owner_id AND expiry_date IS NOT NULL
              GROUP BY month ORDER BY month LIMIT 12) m),
    'vehicle_compliance_rate',
      (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE ROUND(100.0 * count(*) FILTER (WHERE status = 'valid') / count(*), 2) END
        FROM public.compliance_documents WHERE owner_id = v_owner_id AND entity_type = 'vehicle'),
    'driver_compliance_rate',
      (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE ROUND(100.0 * count(*) FILTER (WHERE status = 'valid') / count(*), 2) END
        FROM public.compliance_documents WHERE owner_id = v_owner_id AND entity_type = 'driver'),
    'by_owner',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'owner_id', owner_id, 'valid', valid_cnt, 'expired', expired_cnt, 'total', total_cnt,
          'score', CASE WHEN total_cnt = 0 THEN 0 ELSE ROUND(100.0 * valid_cnt / total_cnt, 2) END)
        ), '[]'::jsonb)
        FROM (
          SELECT owner_id,
                 count(*) FILTER (WHERE status = 'valid') valid_cnt,
                 count(*) FILTER (WHERE status = 'expired') expired_cnt,
                 count(*) total_cnt
          FROM public.compliance_documents
          GROUP BY owner_id
        ) co)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- 20. RPC: generate_compliance_report
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_compliance_report(_report_type TEXT DEFAULT 'all', _owner_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role) AND _owner_id IS NOT NULL THEN
    v_owner_id := _owner_id;
  ELSE
    v_owner_id := auth.uid();
  END IF;

  SELECT jsonb_build_object(
    'expired',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cd.id, 'document_number', cd.document_number, 'document_type', dt.name,
        'entity_type', cd.entity_type, 'expiry_date', cd.expiry_date, 'owner_id', cd.owner_id)
      ), '[]'::jsonb)
        FROM public.compliance_documents cd JOIN public.document_types dt ON dt.id = cd.document_type_id
        WHERE cd.owner_id = v_owner_id AND cd.status = 'expired'),
    'upcoming',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cd.id, 'document_number', cd.document_number, 'document_type', dt.name,
        'entity_type', cd.entity_type, 'expiry_date', cd.expiry_date, 'days_remaining', (cd.expiry_date - CURRENT_DATE))
      ), '[]'::jsonb)
        FROM public.compliance_documents cd JOIN public.document_types dt ON dt.id = cd.document_type_id
        WHERE cd.owner_id = v_owner_id AND cd.expiry_date IS NOT NULL
          AND cd.expiry_date <= CURRENT_DATE + 90 AND cd.status <> 'expired'),
    'missing',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'entity_type', entity_type, 'entity_id', entity_id, 'document_name', dt.name)
      ), '[]'::jsonb)
        FROM (
          SELECT rd.entity_type, rd.entity_id, rd.document_type_id
          FROM public.required_documents rd
          LEFT JOIN public.compliance_documents cd
            ON cd.entity_type = rd.entity_type AND cd.owner_id = v_owner_id
            AND cd.document_type_id = rd.document_type_id
            AND cd.entity_type = 'vehicle' AND cd.vehicle_id = rd.entity_id
            AND cd.entity_type = 'driver' AND cd.driver_id = rd.entity_id
            AND cd.entity_type = 'crew' AND cd.crew_id = rd.entity_id
          WHERE rd.owner_id = v_owner_id AND cd.id IS NULL
        ) miss
        JOIN public.document_types dt ON dt.id = miss.document_type_id)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- 21. RPC: run_compliance_expiry_check
--    Standalone job: updates statuses and sends notifications.
--    Callable by postgres (edge function) via service role.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_compliance_expiry_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.compliance_documents
  SET status = public.compute_document_status(expiry_date), updated_at = now()
  WHERE status IN ('valid', 'expiring_soon') OR status IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Recompute scores for affected owners
  PERFORM public.calculate_compliance_score(owner_id)
  FROM (SELECT DISTINCT owner_id FROM public.compliance_documents) d;

  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$$;

-- ---------------------------------------------------------------------
-- 22. Storage bucket + policies
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('compliance-documents', 'compliance-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "compliance_docs_upload" ON storage.objects;
DROP POLICY IF EXISTS "compliance_docs_read"   ON storage.objects;
DROP POLICY IF EXISTS "compliance_docs_delete" ON storage.objects;

-- Path layout: {owner_id}/{category}/{filename}
CREATE POLICY "compliance_docs_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "compliance_docs_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "compliance_docs_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR (storage.foldername(name))[1] = auth.uid()::text)
  );

-- ---------------------------------------------------------------------
-- 23. Realtime
-- ---------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.compliance_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_verifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspection_schedules;

-- ---------------------------------------------------------------------
-- 24. Grants
-- ---------------------------------------------------------------------
GRANT SELECT ON public.document_types TO authenticated;
GRANT ALL  ON public.document_types TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.required_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_schedules TO authenticated;

GRANT EXECUTE ON FUNCTION public.calculate_compliance_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_document(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expiring_documents(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_compliance_dashboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_compliance_report(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_compliance_expiry_check() TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_document_status(DATE) TO authenticated;
