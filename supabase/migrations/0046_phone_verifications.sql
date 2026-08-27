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
