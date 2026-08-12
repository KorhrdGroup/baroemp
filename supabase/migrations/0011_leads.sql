-- 0011_leads.sql

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  score integer not null default 0,
  grade text not null default 'D',
  status text not null default 'new',
  owner_id uuid references public.profiles (id) on delete set null,
  primary_interest text,
  recommended_content_id uuid references public.contents (id) on delete set null,
  next_contact_at timestamptz,
  last_contact_at timestamptz,
  last_activity_at timestamptz,
  score_breakdown jsonb not null default '{}'::jsonb,
  recent_action_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- consultations.lead_id FK
alter table public.consultations
  drop constraint if exists consultations_lead_id_fkey;

alter table public.consultations
  add constraint consultations_lead_id_fkey
  foreign key (lead_id) references public.leads (id) on delete set null;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();
