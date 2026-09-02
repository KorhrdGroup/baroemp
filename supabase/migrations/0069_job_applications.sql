-- 0069: 회원이 직접 표시하는 지원·면접·취업 상태.
--
-- 지원은 외부 사이트(워크넷 등)에서 이뤄져 우리는 "지원 페이지로 이동" 클릭까지만 안다.
-- 마이페이지 5단계 "지원하기"를 완료로 칠 근거가 없어, 회원이 직접 표시한 값을 둔다.
-- 상태는 applied → interview → hired 순서로 올라가며, 공고 하나에 한 줄이다.
-- 관리자 CRM 은 이 값을 "회원이 알려준 것"으로 읽는다 - 실제 합격 여부를 우리가 확인한 게 아니다.

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  status text not null check (status in ('applied', 'interview', 'hired')),
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists job_applications_user_idx on public.job_applications (user_id, reported_at desc);

drop trigger if exists trg_job_applications_updated_at on public.job_applications;
create trigger trg_job_applications_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();

alter table public.job_applications enable row level security;

drop policy if exists job_applications_own on public.job_applications;
create policy job_applications_own on public.job_applications
  for all
  using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

comment on table public.job_applications is '회원이 직접 표시한 지원·면접·취업 상태 (외부 지원이라 실제 여부는 확인 불가)';
