-- 0040_step7_5_employment_destinations.sql
-- STEP 7.5: Career Gap Engine - Employment Destination Domain (스펙 4번).
-- 같은 직업(occupation)이라도 취업처에 따라 채용시장 요구조건 통계가 달라질 수 있도록
-- occupation과는 별개의 도메인으로 분리한다. 관리자가 향후 자유롭게 추가할 수 있도록
-- Destination 이름/코드를 코드에 하드코딩하지 않는다.

create table if not exists public.employment_destinations (
  id uuid primary key default gen_random_uuid(),
  occupation_id uuid not null references public.occupations (id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  category text,
  tags jsonb not null default '[]'::jsonb,
  -- Job -> Destination 분류용 키워드 (V1: Rule/Keyword 기반). 향후 AI Classification으로
  -- 교체하더라도 이 컬럼 구조는 유지한 채 분류 로직만 갈아끼울 수 있도록 분리한다.
  classifier_keywords jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_employment_destinations_updated_at on public.employment_destinations;
create trigger trg_employment_destinations_updated_at
  before update on public.employment_destinations
  for each row execute function public.set_updated_at();

create index if not exists idx_employment_destinations_occupation on public.employment_destinations (occupation_id, order_index);

-- ── V1 시드: 사회복지사(occupation_id=0017 seed 기준) 취업처 6종 ────────────
insert into public.employment_destinations (occupation_id, name, slug, description, category, classifier_keywords, order_index)
values
  (
    '662377e2-ac86-b921-20a3-ed500820b6ff',
    '재가복지센터',
    'home-care-center',
    '재가 어르신 가정을 방문해 돌봄 서비스를 연계·관리하는 기관입니다.',
    'care',
    '["재가복지","재가노인","방문요양","재가장기요양","재가센터"]'::jsonb,
    1
  ),
  (
    '662377e2-ac86-b921-20a3-ed500820b6ff',
    '요양원',
    'nursing-home',
    '입소 어르신의 생활지원 계획을 수립하고 관리하는 요양시설입니다.',
    'care',
    '["요양원","요양시설","노인요양원","노인의료복지시설"]'::jsonb,
    2
  ),
  (
    '662377e2-ac86-b921-20a3-ed500820b6ff',
    '주야간보호센터',
    'day-night-care-center',
    '주야간보호센터에서 어르신 프로그램 운영과 사례관리를 담당합니다.',
    'care',
    '["주야간보호","데이케어","주간보호센터"]'::jsonb,
    3
  ),
  (
    '662377e2-ac86-b921-20a3-ed500820b6ff',
    '지역아동센터',
    'community-child-center',
    '지역아동센터에서 아동 돌봄과 학습지도, 생활관리를 지원합니다.',
    'child',
    '["지역아동센터","아동센터","방과후교실"]'::jsonb,
    4
  ),
  (
    '662377e2-ac86-b921-20a3-ed500820b6ff',
    '종합사회복지관',
    'community-welfare-center',
    '종합사회복지관에서 지역 주민 대상 복지 서비스를 기획·운영합니다.',
    'welfare',
    '["종합사회복지관","사회복지관","복지관"]'::jsonb,
    5
  ),
  (
    '662377e2-ac86-b921-20a3-ed500820b6ff',
    '장애인복지시설',
    'disability-welfare-facility',
    '장애인복지시설에서 이용자 생활지원과 프로그램 운영을 담당합니다.',
    'disability',
    '["장애인복지","장애인시설","장애인보호작업장","장애인주간보호"]'::jsonb,
    6
  )
on conflict (slug) do nothing;
