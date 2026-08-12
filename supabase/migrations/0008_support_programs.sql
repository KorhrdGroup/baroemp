-- 0008_support_programs.sql

create table if not exists public.support_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text not null default '',
  summary text not null default '',
  description text not null default '',
  support_type text not null default 'other',
  target_age_groups jsonb not null default '[]'::jsonb,
  target_regions jsonb not null default '[]'::jsonb,
  target_conditions jsonb not null default '[]'::jsonb,
  related_job_categories jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  apply_url text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_program_tags (
  support_program_id uuid not null references public.support_programs (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (support_program_id, tag_id)
);

drop trigger if exists trg_support_programs_updated_at on public.support_programs;
create trigger trg_support_programs_updated_at
  before update on public.support_programs
  for each row execute function public.set_updated_at();
