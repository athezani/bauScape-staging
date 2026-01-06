-- ============================================
-- MIGRATIONS ECOMMERCE-HOMEPAGE - TUTTE IN UNA VOLTA
-- Applica tutto questo SQL nel SQL Editor di Supabase
-- URL: https://supabase.com/dashboard/project/azvsktgeqwvvhqomndsn/sql/new
-- ============================================

-- Migration 0001: Create experiences
-- Enable UUID generation if not already available
create extension if not exists "pgcrypto";

-- Helper function to keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid,
  name text not null,
  description text,
  max_participants integer check (max_participants is null or max_participants > 0),
  duration_hours integer check (duration_hours is null or duration_hours > 0),
  meeting_point text,
  pricing_type text default 'fixed',
  price_adult_base numeric(10,2) not null default 0 check (price_adult_base >= 0),
  price_dog_base numeric(10,2) default 0 check (price_dog_base >= 0),
  predefined_prices jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experience_provider_idx on public.experience (provider_id);
create index if not exists experience_pricing_type_idx on public.experience (pricing_type);

drop trigger if exists experience_set_updated_at on public.experience;
create trigger experience_set_updated_at
before update on public.experience
for each row
execute procedure public.set_updated_at();

-- Migration 0002: Create classes
create table if not exists public.class (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid,
  name text not null,
  description text,
  max_participants integer check (max_participants is null or max_participants > 0),
  duration_hours integer check (duration_hours is null or duration_hours > 0),
  meeting_point text,
  pricing_type text default 'fixed',
  price_adult_base numeric(10,2) not null default 0 check (price_adult_base >= 0),
  price_dog_base numeric(10,2) default 0 check (price_dog_base >= 0),
  predefined_prices jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists class_provider_idx on public.class (provider_id);
create index if not exists class_pricing_type_idx on public.class (pricing_type);

drop trigger if exists class_set_updated_at on public.class;
create trigger class_set_updated_at
before update on public.class
for each row
execute procedure public.set_updated_at();

-- Migration 0003: Create trips
create table if not exists public.trip (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid,
  name text not null,
  description text,
  max_participants integer check (max_participants is null or max_participants > 0),
  duration_hours integer check (duration_hours is null or duration_hours > 0),
  meeting_point text,
  pricing_type text default 'fixed',
  price_adult_base numeric(10,2) not null default 0 check (price_adult_base >= 0),
  price_dog_base numeric(10,2) default 0 check (price_dog_base >= 0),
  predefined_prices jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_provider_idx on public.trip (provider_id);
create index if not exists trip_pricing_type_idx on public.trip (pricing_type);

drop trigger if exists trip_set_updated_at on public.trip;
create trigger trip_set_updated_at
before update on public.trip
for each row
execute procedure public.set_updated_at();

-- Migration 0004: Create bookings
create table if not exists public.booking (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  product_type text not null check (product_type in ('experience', 'class', 'trip')),
  product_id uuid not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  booking_date date,
  number_of_adults integer not null default 1 check (number_of_adults > 0),
  number_of_dogs integer not null default 0 check (number_of_dogs >= 0),
  total_amount_paid numeric(10,2) not null check (total_amount_paid >= 0),
  currency text not null default 'EUR',
  customer_email text,
  customer_name text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_customer_idx on public.booking (customer_id);
create index if not exists booking_product_idx on public.booking (product_type, product_id);
create index if not exists booking_stripe_session_idx on public.booking (stripe_checkout_session_id);
create index if not exists booking_status_idx on public.booking (status);
create index if not exists booking_created_at_idx on public.booking (created_at);

drop trigger if exists booking_set_updated_at on public.booking;
create trigger booking_set_updated_at
before update on public.booking
for each row
execute procedure public.set_updated_at();

-- Migration 0005: Alter trips structure
alter table if exists public.trip
  drop column if exists duration_hours,
  drop column if exists meeting_point;

alter table if exists public.trip
  add column if not exists duration_days integer check (duration_days is null or duration_days > 0),
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists location text,
  add column if not exists booking_qty integer default 0 check (booking_qty >= 0);

alter table if exists public.trip
  drop constraint if exists trip_date_range_check;

alter table if exists public.trip
  add constraint trip_date_range_check
  check (end_date is null or start_date is null or end_date >= start_date);

create index if not exists trip_location_idx on public.trip (location);
create index if not exists trip_dates_idx on public.trip (start_date, end_date);

-- Migration 0020: Create cancellation_request
create table if not exists public.cancellation_request (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking(id) on delete cascade,
  cancellation_token text not null unique,
  order_number text not null,
  customer_email text not null,
  customer_name text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text,
  admin_notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cancellation_request_booking_idx on public.cancellation_request (booking_id);
create index if not exists cancellation_request_token_idx on public.cancellation_request (cancellation_token);
create index if not exists cancellation_request_status_idx on public.cancellation_request (status);
create index if not exists cancellation_request_requested_at_idx on public.cancellation_request (requested_at);

drop trigger if exists cancellation_request_set_updated_at on public.cancellation_request;
create trigger cancellation_request_set_updated_at
before update on public.cancellation_request
for each row
execute procedure public.set_updated_at();

alter table public.cancellation_request enable row level security;

create policy "Anyone can create cancellation requests"
on public.cancellation_request
for insert
with check (true);

create policy "Service role can view all cancellation requests"
on public.cancellation_request
for select
using (true);

create policy "Service role can update cancellation requests"
on public.cancellation_request
for update
using (true);

create or replace function public.is_cancellation_token_valid(
  _booking_id uuid
)
returns boolean
language plpgsql
stable
as $$
declare
  _booking record;
  _expiry_datetime timestamptz;
begin
  select 
    booking_date,
    end_date
  into _booking
  from public.booking
  where id = _booking_id;
  
  if not found then
    return false;
  end if;
  
  if _booking.end_date is not null then
    _expiry_datetime := (_booking.end_date + interval '1 day' + time '23:59:59')::timestamptz;
  else
    _expiry_datetime := (_booking.booking_date + interval '1 day' + time '23:59:59')::timestamptz;
  end if;
  
  return now() <= _expiry_datetime;
end;
$$;

comment on table public.cancellation_request is 'Tracks customer cancellation requests for bookings. Processed manually by admin.';
comment on column public.cancellation_request.cancellation_token is 'Secure token for magic link access. Valid until 24h after booking/trip end date.';
comment on column public.cancellation_request.status is 'pending: awaiting admin action, approved: admin approved (booking will be cancelled), rejected: admin rejected, cancelled: customer cancelled their request';

-- ✅ TUTTE LE MIGRATIONS APPLICATE!
