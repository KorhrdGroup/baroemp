-- 0046_phone_verifications.sql
-- 휴대폰 인증번호 발급/검증 기록. 코드는 평문 저장하지 않고 해시만 보관한다.
-- 서버(service role)만 접근한다 - RLS를 켜고 정책을 두지 않아 클라이언트 접근을 전면 차단한다.

create table if not exists public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null check (purpose in ('signup', 'find_id', 'find_password')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempt_count integer not null default 0,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_phone_verifications_lookup
  on public.phone_verifications (phone, purpose, created_at desc);

alter table public.phone_verifications enable row level security;

-- 인증 시도 횟수를 원자적으로 1 증가시키고 증가 후 값을 돌려준다.
-- select 후 update 2단계로 하면 병렬 요청에서 증가분이 유실되어 시도 횟수 제한이 무력화된다.
create or replace function public.increment_phone_verification_attempt(p_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.phone_verifications
     set attempt_count = attempt_count + 1
   where id = p_id
  returning attempt_count;
$$;

revoke all on function public.increment_phone_verification_attempt(uuid) from public, anon, authenticated;
