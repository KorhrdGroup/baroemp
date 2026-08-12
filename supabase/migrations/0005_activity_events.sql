-- 0005_activity_events.sql
-- 회원가입 전 anonymous_id 지원 + UTM 포함 범용 이벤트

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  anonymous_id text,
  session_id text,
  event_type text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  source text,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on column public.activity_events.event_type is
  '열린 문자열. 예: ASSESSMENT_COMPLETED, JOB_VIEWED. enum 으로 폐쇄하지 않음.';

create table if not exists public.anonymous_identity_links (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  linked_at timestamptz not null default now(),
  unique (anonymous_id, user_id)
);
