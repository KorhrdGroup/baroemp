-- 0012_matches.sql

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id text not null,
  score integer not null default 0,
  grade text,
  reason jsonb not null default '[]'::jsonb,
  engine_version text not null default 'rule-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists match_results_user_target_uidx
  on public.match_results (user_id, target_type, target_id)
  where user_id is not null;

drop trigger if exists trg_match_results_updated_at on public.match_results;
create trigger trg_match_results_updated_at
  before update on public.match_results
  for each row execute function public.set_updated_at();
