CREATE OR REPLACE FUNCTION public.get_staff_users()
RETURNS TABLE (id UUID, display_name TEXT, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT u.id, p.display_name, u.email::text AS email
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE ur.role::text = 'staff'
  ORDER BY p.display_name NULLS LAST, u.email;
$fn$;

