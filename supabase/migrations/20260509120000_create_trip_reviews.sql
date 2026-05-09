-- =========================================================
-- TRIP REVIEWS TABLE
-- =========================================================

create extension if not exists "pgcrypto";

create table if not exists public.trip_reviews (
  id uuid primary key default gen_random_uuid(),

  -- User who submitted review
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  -- Related booking
  booking_id uuid not null
    references public.bookings(id)
    on delete cascade,

  -- Rating from 1 to 5
  rating int not null
    check (rating >= 1 and rating <= 5),

  -- Written review
  review_text text not null,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Prevent duplicate reviews for same booking
  constraint unique_user_booking_review
    unique(user_id, booking_id)
);

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists idx_trip_reviews_user_id
on public.trip_reviews(user_id);

create index if not exists idx_trip_reviews_booking_id
on public.trip_reviews(booking_id);

create index if not exists idx_trip_reviews_created_at
on public.trip_reviews(created_at desc);

-- =========================================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.trip_reviews
enable row level security;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- Anyone can read reviews
create policy "Public can view reviews"
on public.trip_reviews
for select
using (true);

-- Logged-in users can insert only their own reviews
create policy "Users can insert own reviews"
on public.trip_reviews
for insert
to authenticated
with check (
  auth.uid() = user_id
);

-- Users can update only their own reviews
create policy "Users can update own reviews"
on public.trip_reviews
for update
to authenticated
using (
  auth.uid() = user_id
);

-- Users can delete only their own reviews
create policy "Users can delete own reviews"
on public.trip_reviews
for delete
to authenticated
using (
  auth.uid() = user_id
);

-- =========================================================
-- AUTO UPDATE updated_at
-- =========================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_trip_reviews_updated_at
on public.trip_reviews;

create trigger update_trip_reviews_updated_at
before update
on public.trip_reviews
for each row
execute function public.update_updated_at_column();