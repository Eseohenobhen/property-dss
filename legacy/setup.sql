-- ============================================================
-- PROPERTY DSS — Supabase Setup SQL
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('manager', 'admin')),
  created_at timestamptz default now()
);

-- 2. PROPERTIES
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  property_type text not null check (property_type in ('residential', 'apartment', 'commercial')),
  units integer not null default 1,
  year_built integer,
  total_area_sqm numeric(10,2),
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. MAINTENANCE REQUESTS
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in (
    'roofing', 'structural', 'electrical', 'plumbing',
    'hvac', 'flooring', 'painting', 'security', 'landscaping', 'other'
  )),
  urgency integer not null check (urgency between 1 and 10),   -- 1=low, 10=critical
  impact integer not null check (impact between 1 and 10),     -- safety/value impact
  asset_importance integer not null check (asset_importance between 1 and 10),
  estimated_cost numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'in_progress', 'completed', 'deferred', 'rejected')),
  priority_score numeric(6,2),  -- computed by engine
  requested_by uuid references public.profiles(id),
  assigned_to text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. MAINTENANCE FUND
create table if not exists public.maintenance_funds (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  total_amount numeric(12,2) not null default 0,
  allocated_amount numeric(12,2) not null default 0,
  period_label text not null,  -- e.g. "Q1 2026"
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. FUND ALLOCATIONS
create table if not exists public.fund_allocations (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.maintenance_funds(id) on delete cascade,
  request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  amount_assigned numeric(12,2) not null,
  allocation_date timestamptz default now(),
  allocated_by uuid references public.profiles(id),
  notes text
);

-- ============================================================
-- PRIORITY SCORE FUNCTION
-- Score = (U*0.35) + (I*0.30) + (A*0.20) - (C_normalized*0.15)
-- Category weights (roofing & structural get boosted urgency)
-- ============================================================
create or replace function compute_priority_score(
  urgency integer,
  impact integer,
  asset_importance integer,
  estimated_cost numeric,
  category text
) returns numeric as $$
declare
  category_boost numeric := 0;
  cost_score numeric;
  raw_score numeric;
begin
  -- Normalize cost to 1-10 scale (assuming max reasonable cost = 5,000,000 NGN)
  cost_score := least(10, greatest(1, (estimated_cost / 500000.0)));

  -- Category priority boosts
  case category
    when 'roofing'     then category_boost := 2.0;
    when 'structural'  then category_boost := 1.8;
    when 'electrical'  then category_boost := 1.5;
    when 'plumbing'    then category_boost := 1.2;
    when 'hvac'        then category_boost := 0.8;
    when 'security'    then category_boost := 1.0;
    when 'flooring'    then category_boost := 0.0;
    when 'painting'    then category_boost := -0.5;
    else category_boost := 0.0;
  end case;

  raw_score := (urgency * 0.35)
             + (impact * 0.30)
             + (asset_importance * 0.20)
             - (cost_score * 0.15)
             + category_boost;

  return round(greatest(0, raw_score)::numeric, 2);
end;
$$ language plpgsql immutable;

-- Trigger: auto-compute priority score on insert/update
create or replace function trg_set_priority_score()
returns trigger as $$
begin
  new.priority_score := compute_priority_score(
    new.urgency,
    new.impact,
    new.asset_importance,
    new.estimated_cost,
    new.category
  );
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_priority_score on public.maintenance_requests;
create trigger set_priority_score
  before insert or update on public.maintenance_requests
  for each row execute function trg_set_priority_score();

-- Trigger: update property updated_at
create or replace function trg_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_properties on public.properties;
create trigger set_updated_at_properties
  before update on public.properties
  for each row execute function trg_set_updated_at();

drop trigger if exists set_updated_at_funds on public.maintenance_funds;
create trigger set_updated_at_funds
  before update on public.maintenance_funds
  for each row execute function trg_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.maintenance_funds enable row level security;
alter table public.fund_allocations enable row level security;

-- Profiles: users see their own profile; admins see all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admin can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Properties: all authenticated users can read; only admins can write
create policy "Authenticated users can view properties"
  on public.properties for select
  to authenticated
  using (true);

create policy "Admins can insert properties"
  on public.properties for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update properties"
  on public.properties for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete properties"
  on public.properties for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Maintenance requests: all authenticated users can read; admins can write
create policy "Authenticated users can view requests"
  on public.maintenance_requests for select
  to authenticated
  using (true);

create policy "Admins can manage requests"
  on public.maintenance_requests for all
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Funds: all authenticated users can read; admins can write
create policy "Authenticated users can view funds"
  on public.maintenance_funds for select
  to authenticated
  using (true);

create policy "Admins can manage funds"
  on public.maintenance_funds for all
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Allocations: all authenticated users can read; admins can write
create policy "Authenticated users can view allocations"
  on public.fund_allocations for select
  to authenticated
  using (true);

create policy "Admins can manage allocations"
  on public.fund_allocations for all
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- Handle new user sign-up: auto-create profile
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce(new.raw_user_meta_data->>'role', 'manager')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- SEED DATA (optional demo data)
-- ============================================================
-- Insert a demo property (run manually after creating an admin user)
-- insert into public.properties (name, address, property_type, units, year_built, total_area_sqm, description)
-- values ('Sunrise Estate Block A', '12 Jakande Close, Benin City, Edo State', 'residential', 24, 2015, 1200.00, 'Multi-unit residential block with shared facilities.');
