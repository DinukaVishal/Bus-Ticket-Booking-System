-- Update handle_new_user trigger to assign user role from signup metadata
-- This allows bus owner signups to automatically receive the bus_owner role.

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
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public.app_role
    );

    RETURN NEW;
END;
$$;
