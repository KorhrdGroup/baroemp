-- 0037_step7_experience_bank.sql
-- STEP 7: Experience Bank - 사용자가 자신의 경험을 STAR 구조(상황/과제/행동/결과)로 저장해두고
-- 여러 자기소개서 문항에서 재사용할 수 있게 하는 개인 경험 저장소.

create table if not exists public.experience_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  situation text,
  task text,
  action text,
  result text,
  skills jsonb not null default '[]'::jsonb,
  related_occupations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_experience_bank_updated_at on public.experience_bank;
create trigger trg_experience_bank_updated_at
  before update on public.experience_bank
  for each row execute function public.set_updated_at();

create index if not exists idx_experience_bank_user on public.experience_bank (user_id, updated_at desc);
