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
