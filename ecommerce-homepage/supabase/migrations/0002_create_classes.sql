-- Create class table with same structure as experience
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
