-- 0028_step5_support_sync_runs.sql
-- STEP 5: 관리자 "지원제도 동기화" 실행 이력을 기록하는 테이블 (job_sync_runs와 동일한 구조).

create table if not exists public.support_sync_runs (
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
  -- job_sync_runs.triggered_by와 동일하게 profiles FK를 강제하지 않고 자유 문자열("admin" 등)을 저장한다.
  triggered_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_sync_runs_provider_started
  on public.support_sync_runs (provider, started_at desc);

alter table public.support_sync_runs enable row level security;

create policy support_sync_runs_staff_read on public.support_sync_runs
  for select using (public.is_staff(auth.uid()));

create policy support_sync_runs_admin_write on public.support_sync_runs
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
