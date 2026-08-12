-- 0024_step4_job_sync_runs.sql
-- STEP 4: 관리자 Provider Sync 실행 이력을 기록하는 테이블.

create table if not exists public.job_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  fetched_count integer not null default 0,
  new_count integer not null default 0,
  updated_count integer not null default 0,
  duplicate_count integer not null default 0,
  deactivated_count integer not null default 0,
  error_count integer not null default 0,
  error_message text,
  -- 실제 Supabase Auth 로그인이 아직 연결되지 않아(STEP 3.5 리스크) profiles.id FK를 강제하지 않는다.
  -- 관리자 화면에서 버튼을 누른 주체를 나타내는 자유 문자열("admin" 등)을 그대로 저장한다.
  triggered_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_sync_runs_provider_started
  on public.job_sync_runs (provider, started_at desc);

alter table public.job_sync_runs enable row level security;

create policy job_sync_runs_staff_read on public.job_sync_runs
  for select using (public.is_staff(auth.uid()));

create policy job_sync_runs_admin_write on public.job_sync_runs
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
