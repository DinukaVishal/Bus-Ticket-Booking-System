-- Add route association to trip_reviews so reviews can be filtered by route.

begin;

alter table public.trip_reviews
  add column if not exists route_id uuid references public.routes(id) on delete set null;

alter table public.trip_reviews
  add column if not exists route_name text;

create index if not exists idx_trip_reviews_route_id on public.trip_reviews(route_id);
create index if not exists idx_trip_reviews_route_name on public.trip_reviews(route_name);

commit;
