-- Complete user deletion for UID: 054dc8c2-4e37-4f84-9653-8868b5851fb7
-- This removes ALL records associated with the user account
-- WARNING: This is irreversible - use with caution

-- Delete from tables that reference this user (in correct order to avoid FK constraints)

-- Delete bus conductors assigned by this user
DELETE FROM public.bus_conductors
WHERE bus_owner_id = '054dc8c2-4e37-4f84-9653-8868b5851fb7';

-- Delete bus drivers assigned by this user
DELETE FROM public.bus_drivers
WHERE bus_owner_id = '054dc8c2-4e37-4f84-9653-8868b5851fb7';

-- Delete driver routes for this user
DELETE FROM public.driver_routes
WHERE driver_user_id = '054dc8c2-4e37-4f84-9653-8868b5851fb7';

-- Delete driver buses for this user
DELETE FROM public.driver_buses
WHERE driver_user_id = '054dc8c2-4e37-4f84-9653-8868b5851fb7';

-- Delete driver profile for this user
DELETE FROM public.driver_profiles
WHERE user_id = '054dc8c2-4e37-4f84-9653-8868b5851fb7';

-- Delete bookings made by this user
DELETE FROM public.bookings
WHERE user_id = '054dc8c2-4e37-4f84-9653-8868b5851fb7';

-- Delete user roles for this user
DELETE FROM public.user_roles
WHERE user_id = '054dc8c2-4e37-4f84-9653-8868b5851fb7';

-- Delete profile for this user
DELETE FROM public.profiles
WHERE user_id = '054dc8c2-4e37-4f84-9653-8868b5851fb7';

-- NOTE: The auth.users record cannot be deleted via SQL.
-- You must delete the user from the Supabase Auth dashboard:
-- 1. Go to Authentication > Users in your Supabase dashboard
-- 2. Find user with ID: 054dc8c2-4e37-4f84-9653-8868b5851fb7
-- 3. Click the delete button to remove the auth record
--
-- After deleting from auth.users, the user account will be completely removed.