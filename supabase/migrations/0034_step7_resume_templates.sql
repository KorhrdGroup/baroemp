-- 0034_step7_resume_templates.sql
-- STEP 7: 이력서 / 자기소개서 Template 엔진.
-- Template ID를 코드에 하드코딩하지 않기 위해 관리자가 추가/수정 가능한 테이블로 관리한다.
-- sections(jsonb)에 표시 순서 + 포함 여부를 배열로 담아, 새 Template을 추가할 때도
-- 코드 배포 없이 관리자 화면에서 row만 추가하면 동작하도록 설계했다.

create table if not exists public.resume_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  -- 특정 직종에 종속되지 않도록 자유 문자열로 둔다 (예: general/experienced/midlife/care_welfare/기타 관리자 추가값).
  target_type text not null default 'general',
  -- 순서대로 표시할 section code 배열.
  -- 허용 값(관례): BASIC_INFO, SUMMARY, EXPERIENCE, EDUCATION, QUALIFICATION, TRAINING, SKILLS, PROJECT, ACTIVITY
  sections jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_resume_templates_updated_at on public.resume_templates;
create trigger trg_resume_templates_updated_at
  before update on public.resume_templates
  for each row execute function public.set_updated_at();

create table if not exists public.cover_letter_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  target_type text not null default 'general',
  -- 기본 제공 문항 배열. 사용자가 실제 cover_letter 생성 시 이 값을 복제해 cover_letter_sections를 만들고,
  -- 이후 사용자가 자유롭게 추가/삭제/순서변경 해도 이 템플릿 자체는 영향받지 않는다.
  -- 각 원소 예: { "questionType": "MOTIVATION", "question": "지원 동기를 작성해주세요", "characterLimit": 1000 }
  default_questions jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_cover_letter_templates_updated_at on public.cover_letter_templates;
create trigger trg_cover_letter_templates_updated_at
  before update on public.cover_letter_templates
  for each row execute function public.set_updated_at();

-- ── 이력서 Template V1 시드 (스펙 2번: 최소 4개) ─────────────────────────────
insert into public.resume_templates (code, name, description, target_type, sections, order_index)
values
  (
    'STANDARD',
    '한평생 표준 이력서',
    '일반 취업에 가장 범용적으로 사용하는 표준 이력서입니다.',
    'general',
    '["BASIC_INFO","SUMMARY","EXPERIENCE","EDUCATION","QUALIFICATION","SKILLS","TRAINING","PROJECT","ACTIVITY"]'::jsonb,
    1
  ),
  (
    'EXPERIENCED',
    '경력직 이력서',
    '경력요약/담당업무/성과 중심으로 구성된 경력직 전용 이력서입니다.',
    'experienced',
    '["BASIC_INFO","SUMMARY","SKILLS","EXPERIENCE","QUALIFICATION","EDUCATION","PROJECT"]'::jsonb,
    2
  ),
  (
    'MIDLIFE',
    '중장년 재취업 이력서',
    '기존 경력 활용과 직무전환, 장기근무 가능성을 강조하는 중장년 재취업 이력서입니다.',
    'midlife',
    '["BASIC_INFO","SUMMARY","SKILLS","EXPERIENCE","ACTIVITY","QUALIFICATION","EDUCATION"]'::jsonb,
    3
  ),
  (
    'CARE_WELFARE',
    '복지·돌봄 직무 이력서',
    '사회복지, 재가복지, 요양, 지역아동센터 등 돌봄 직무 지원에 특화된 이력서입니다.',
    'care_welfare',
    '["BASIC_INFO","SUMMARY","QUALIFICATION","SKILLS","EXPERIENCE","TRAINING","EDUCATION","ACTIVITY"]'::jsonb,
    4
  )
on conflict (code) do nothing;

-- ── 자기소개서 Template V1 시드 (스펙 24/25/26/36번) ─────────────────────────
insert into public.cover_letter_templates (code, name, description, target_type, default_questions, order_index)
values
  (
    'GENERAL',
    '일반 자기소개서',
    '지원동기/경력/강점/문제해결/포부 중심의 범용 자기소개서 문항입니다.',
    'general',
    '[
      {"questionType":"MOTIVATION","question":"지원 동기를 작성해주세요.","characterLimit":1000},
      {"questionType":"EXPERIENCE","question":"주요 경력 및 직무 경험을 작성해주세요.","characterLimit":1500},
      {"questionType":"STRENGTH","question":"나의 강점을 작성해주세요.","characterLimit":1000},
      {"questionType":"PROBLEM_SOLVING","question":"문제해결 또는 협업 경험을 작성해주세요.","characterLimit":1500},
      {"questionType":"ASPIRATION","question":"입사 후 포부를 작성해주세요.","characterLimit":1000}
    ]'::jsonb,
    1
  ),
  (
    'MIDLIFE',
    '중장년 재취업 자기소개서',
    '경험/실무/안정성 중심으로 재취업 의지를 드러내는 중장년 특화 자기소개서입니다.',
    'midlife',
    '[
      {"questionType":"MOTIVATION","question":"지원 직무에 관심을 갖게 된 이유를 작성해주세요.","characterLimit":1000},
      {"questionType":"EXPERIENCE","question":"지금까지의 경력과 주요 경험을 작성해주세요.","characterLimit":1500},
      {"questionType":"JOB_FIT","question":"기존 경험을 지원 직무에서 어떻게 활용할 수 있는지 작성해주세요.","characterLimit":1500},
      {"questionType":"STRENGTH","question":"업무상 강점을 작성해주세요.","characterLimit":1000},
      {"questionType":"ASPIRATION","question":"재취업 후 목표와 장기근무 의지를 작성해주세요.","characterLimit":1000}
    ]'::jsonb,
    2
  ),
  (
    'CARE_WELFARE',
    '복지·돌봄 자기소개서',
    '대인관계/상담/책임감 등 돌봄 직무 역량을 드러내는 자기소개서입니다.',
    'care_welfare',
    '[
      {"questionType":"MOTIVATION","question":"지원 동기를 작성해주세요.","characterLimit":1000},
      {"questionType":"FIELD_INTEREST","question":"복지/돌봄 분야에 관심을 갖게 된 계기를 작성해주세요.","characterLimit":1000},
      {"questionType":"INTERPERSONAL","question":"대인관계 또는 상담 경험을 작성해주세요.","characterLimit":1500},
      {"questionType":"CONFLICT_HANDLING","question":"갈등이나 민원에 대응했던 경험을 작성해주세요.","characterLimit":1500},
      {"questionType":"RESPONSIBILITY","question":"책임감과 업무 태도에 대해 작성해주세요.","characterLimit":1000},
      {"questionType":"CONTRIBUTION","question":"기관에서 기여할 수 있는 점을 작성해주세요.","characterLimit":1000}
    ]'::jsonb,
    3
  )
on conflict (code) do nothing;
