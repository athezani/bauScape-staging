-- Alter trip table to match new structure
-- Remove duration_hours and meeting_point
-- Add duration_days, start_date, end_date, location, booking_qty

-- Drop old columns
alter table if exists public.trip
  drop column if exists duration_hours,
  drop column if exists meeting_point;

-- Add new columns
alter table if exists public.trip
  add column if not exists duration_days integer check (duration_days is null or duration_days > 0),
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists location text,
  add column if not exists booking_qty integer default 0 check (booking_qty >= 0);

-- Add check constraint to ensure end_date is after start_date
alter table if exists public.trip
  drop constraint if exists trip_date_range_check;

alter table if exists public.trip
  add constraint trip_date_range_check
  check (end_date is null or start_date is null or end_date >= start_date);

-- Create index on location for filtering
create index if not exists trip_location_idx on public.trip (location);

-- Create index on date range for filtering
create index if not exists trip_dates_idx on public.trip (start_date, end_date);

