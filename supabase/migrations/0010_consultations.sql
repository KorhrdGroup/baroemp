-- 0010_consultations.sql

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid,
  consultant_id uuid references public.profiles (id) on delete set null,
  type text,
  channel text not null default 'phone',
  status text not null default 'requested',
  requested_topic text,
  preferred_at timestamptz,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  summary text,
  customer_need text,
  recommended_contents jsonb not null default '[]'::jsonb,
  next_action text,
  next_contact_at timestamptz,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultation_notes (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

drop trigger if exists trg_consultations_updated_at on public.consultations;
create trigger trg_consultations_updated_at
  before update on public.consultations
  for each row execute function public.set_updated_at();
