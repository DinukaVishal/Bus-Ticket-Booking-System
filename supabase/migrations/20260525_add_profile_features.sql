-- =====================================================================
-- User Profile Management Features
-- Consolidated migration:
--   1. "avatars" storage bucket + secure RLS/storage policies
--   2. profiles table: phone_number, address, city columns
--   3. user_preferences table (email/booking/promotional notifications,
--      language) with FK to auth.users, unique per user, auto-creation
--      on signup, and RLS policies
--
-- Security model:
--   Users can manage ONLY their own avatar, contact details, and
--   preferences. No cross-user access.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. AVATARS STORAGE BUCKET + POLICIES
-- ---------------------------------------------------------------------

-- Create the bucket (public so avatar URLs are directly accessible, but
-- write operations are restricted to the owning user only).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- File type validation: only images. A simple CHECK on the extension is
-- enforced at the storage layer; the client also validates MIME types.
DROP POLICY IF EXISTS "avatars_upload_own"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_read"         ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"   ON storage.objects;

-- Upload path: {userId}/{filename}
-- Only authenticated users can upload into their own folder.
CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
  );

-- Users can update only objects inside their own folder.
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
  );

-- Public read access for avatars (bucket is public; this policy is still
-- declared so it can be customised later without a migration).
CREATE POLICY "avatars_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

-- Users can delete only objects inside their own folder.
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- 2. PROFILES: CONTACT DETAILS COLUMNS
-- ---------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS address      TEXT,
  ADD COLUMN IF NOT EXISTS city         TEXT;

-- updated_at is already maintained by the update_profiles_updated_at
-- trigger (created in 20260120203507). Nothing extra needed here.

-- ---------------------------------------------------------------------
-- 3. USER PREFERENCES TABLE
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications     BOOLEAN NOT NULL DEFAULT true,
  booking_notifications   BOOLEAN NOT NULL DEFAULT true,
  promotional_notifications BOOLEAN NOT NULL DEFAULT false,
  language                TEXT NOT NULL DEFAULT 'en',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_user_id_key UNIQUE (user_id),
  CONSTRAINT user_preferences_language_check
    CHECK (language IN ('en', 'si', 'ta'))
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON public.user_preferences (user_id);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_user_preferences_updated_at
  ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create a preferences record for every new user (via the existing
-- on_auth_user_created trigger which calls handle_new_user()).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    )
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public.app_role
    )
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. USER PREFERENCES RLS POLICIES
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "preferences_select_own" ON public.user_preferences;
DROP POLICY IF EXISTS "preferences_insert_own" ON public.user_preferences;
DROP POLICY IF EXISTS "preferences_update_own" ON public.user_preferences;

-- Users can select only their own preferences
CREATE POLICY "preferences_select_own"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert only their own preferences
CREATE POLICY "preferences_insert_own"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update only their own preferences
CREATE POLICY "preferences_update_own"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all preferences (helpful for support/audit)
DROP POLICY IF EXISTS "preferences_admin_all" ON public.user_preferences;
CREATE POLICY "preferences_admin_all"
  ON public.user_preferences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- 5. GRANTS
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;

