-- Updates trip_reviews to allow submitting reviews without requiring booking_id
-- and adds a required passenger_name column.

begin;

-- Ensure passenger_name exists and is required
alter table public.trip_reviews
  add column if not exists passenger_name text;

-- If the column was just added, populate existing rows with a fallback
-- (prevents NOT NULL failure on migration). If you already have data that
-- matches passenger names, you can replace this fallback later.
update public.trip_reviews
set passenger_name = coalesce(passenger_name, 'Anonymous');

alter table public.trip_reviews
  alter column passenger_name set not null;

-- Drop constraints that depend on booking_id
-- (constraint name from the original migration)
alter table public.trip_reviews
  drop constraint if exists unique_user_booking_review;

-- Drop NOT NULL + FK to allow inserts without booking_id
alter table public.trip_reviews
  drop constraint if exists trip_reviews_booking_id_fkey;

alter table public.trip_reviews
  alter column booking_id drop not null;

-- If booking_id still exists, remove any index that is no longer useful.
-- (Safe even if index doesn't exist.)
drop index if exists public.idx_trip_reviews_booking_id;

-- Optional: also drop any lingering FK/trigger policies are already based on user_id.

commit;

