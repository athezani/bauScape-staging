-- ============================================
-- Create cancellation_request table
-- ============================================
-- This table tracks all cancellation requests from customers
-- Requests can be approved/rejected by admin
-- ============================================

-- Create cancellation_request table
create table if not exists public.cancellation_request (
  id uuid primary key default gen_random_uuid(),
  
  -- Booking reference
  booking_id uuid not null references public.booking(id) on delete cascade,
  
  -- Magic token for secure access (signed with secret)
  cancellation_token text not null unique,
  
  -- Customer identification (for validation and fallback form)
  order_number text not null,
  customer_email text not null,
  customer_name text not null,
  
  -- Request details
  reason text, -- Optional reason from customer
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  
  -- Processing info
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text, -- Admin email who processed
  admin_notes text, -- Internal notes
  
  -- Metadata
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists cancellation_request_booking_idx on public.cancellation_request (booking_id);
create index if not exists cancellation_request_token_idx on public.cancellation_request (cancellation_token);
create index if not exists cancellation_request_status_idx on public.cancellation_request (status);
create index if not exists cancellation_request_requested_at_idx on public.cancellation_request (requested_at);

-- Trigger for updated_at
drop trigger if exists cancellation_request_set_updated_at on public.cancellation_request;
create trigger cancellation_request_set_updated_at
before update on public.cancellation_request
for each row
execute procedure public.set_updated_at();

-- RLS Policies
alter table public.cancellation_request enable row level security;

-- Public can create cancellation requests (via edge function with token validation)
create policy "Anyone can create cancellation requests"
on public.cancellation_request
for insert
with check (true); -- Validation happens in edge function

-- Only authenticated admins can view all requests
-- (For now we don't have admin role, so service role will be used via edge functions)
create policy "Service role can view all cancellation requests"
on public.cancellation_request
for select
using (true); -- Will be called via service role key

-- Only authenticated admins can update requests
create policy "Service role can update cancellation requests"
on public.cancellation_request
for update
using (true); -- Will be called via service role key

-- Function to check if cancellation token is still valid
-- Token is valid until 24h after end_date (or booking_date if no end_date)
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
  -- Get booking info
  select 
    booking_date,
    end_date
  into _booking
  from public.booking
  where id = _booking_id;
  
  if not found then
    return false;
  end if;
  
  -- Calculate expiry: 24h after end_date (or booking_date if no end_date)
  if _booking.end_date is not null then
    _expiry_datetime := (_booking.end_date + interval '1 day' + time '23:59:59')::timestamptz;
  else
    _expiry_datetime := (_booking.booking_date + interval '1 day' + time '23:59:59')::timestamptz;
  end if;
  
  -- Check if current time is before expiry
  return now() <= _expiry_datetime;
end;
$$;

-- Comment for documentation
comment on table public.cancellation_request is 'Tracks customer cancellation requests for bookings. Processed manually by admin.';
comment on column public.cancellation_request.cancellation_token is 'Secure token for magic link access. Valid until 24h after booking/trip end date.';
comment on column public.cancellation_request.status is 'pending: awaiting admin action, approved: admin approved (booking will be cancelled), rejected: admin rejected, cancelled: customer cancelled their request';

