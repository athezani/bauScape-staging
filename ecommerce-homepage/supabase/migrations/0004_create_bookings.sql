-- Create booking table to track successful payments
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
