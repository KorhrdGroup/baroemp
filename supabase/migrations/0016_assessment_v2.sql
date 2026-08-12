-- 0016_assessment_v2.sql
-- STEP 3: "내게 맞는 직업 찾기" 를 실제 서비스 수준으로 확장하기 위한 스키마 변경.
-- 기존 0006_assessments.sql 골격을 유지하면서, 문항/선택지가 DB 기반으로 완전히
-- 렌더링되고 Occupation Matching Rule로 추천이 계산되도록 컬럼/테이블을 추가한다.

-- 1) assessments: 섹션 구성을 데이터로 관리
alter table public.assessments
  add column if not exists sections jsonb not null default '[]'::jsonb;

-- 2) assessment_questions: 질문 UX/Engine이 요구하는 속성 확장
alter table public.assessment_questions
  add column if not exists section text not null default 'basic',
  add column if not exists question_text text,
  add column if not exists description text,
  add column if not exists answer_type text not null default 'SINGLE',
  add column if not exists order_index integer not null default 0,
  add column if not exists required boolean not null default true,
  add column if not exists profile_field text,
  add column if not exists scoring_dimension text,
  add column if not exists min_scale integer,
  add column if not exists max_scale integer;

update public.assessment_questions set question_text = prompt where question_text is null;
alter table public.assessment_questions alter column question_text set not null;

-- prompt/question_type/sort_order 는 하위호환을 위해 유지 (deprecated).
comment on column public.assessment_questions.prompt is 'deprecated: question_text 사용';
comment on column public.assessment_questions.question_type is 'deprecated: answer_type 사용';
comment on column public.assessment_questions.sort_order is 'deprecated: order_index 사용';

-- 3) assessment_options: option_text/score_map/profile_value/tags 지원
alter table public.assessment_options
  add column if not exists option_text text,
  add column if not exists score_map jsonb not null default '{}'::jsonb,
  add column if not exists profile_value jsonb,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists order_index integer not null default 0;

update public.assessment_options set option_text = label where option_text is null;
alter table public.assessment_options alter column option_text set not null;
comment on column public.assessment_options.label is 'deprecated: option_text 사용';
comment on column public.assessment_options.sort_order is 'deprecated: order_index 사용';

-- 4) assessment_sessions: 진행률/이탈 분석, anonymous 병합을 위한 컬럼
alter table public.assessment_sessions
  add column if not exists total_questions integer not null default 0,
  add column if not exists answered_count integer not null default 0,
  add column if not exists current_step integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_assessment_sessions_updated_at on public.assessment_sessions;
create trigger trg_assessment_sessions_updated_at
  before update on public.assessment_sessions
  for each row execute function public.set_updated_at();

create index if not exists assessment_sessions_anonymous_id_idx on public.assessment_sessions (anonymous_id);
create index if not exists assessment_sessions_user_id_idx on public.assessment_sessions (user_id);

-- 5) assessment_answers: MULTI/자유값 answer_value, 갱신 시각
alter table public.assessment_answers
  add column if not exists option_ids jsonb not null default '[]'::jsonb,
  add column if not exists answer_value jsonb,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists assessment_answers_session_question_uidx
  on public.assessment_answers (session_id, question_id);

-- 6) assessment_results: Career DB 생성기 결과 저장 구조
alter table public.assessment_results
  add column if not exists dimension_scores jsonb not null default '{}'::jsonb,
  add column if not exists extracted_profile jsonb not null default '{}'::jsonb,
  add column if not exists generated_tags jsonb not null default '[]'::jsonb,
  add column if not exists engine_version text not null default 'CAREER_ASSESSMENT_V1',
  add column if not exists anonymous_id text;

create index if not exists assessment_results_user_id_idx on public.assessment_results (user_id);
create index if not exists assessment_results_anonymous_id_idx on public.assessment_results (anonymous_id);

-- 7) occupations: Occupation Matching Engine이 참조하는 확장 필드
alter table public.occupations
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists related_content_ids jsonb not null default '[]'::jsonb,
  add column if not exists required_qualifications jsonb not null default '[]'::jsonb,
  add column if not exists recommended_age_groups jsonb not null default '[]'::jsonb,
  add column if not exists preferred_employment_types jsonb not null default '[]'::jsonb,
  add column if not exists preferred_regions jsonb not null default '[]'::jsonb,
  add column if not exists job_category_code text,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_occupations_updated_at on public.occupations;
create trigger trg_occupations_updated_at
  before update on public.occupations
  for each row execute function public.set_updated_at();

-- 8) occupation_matching_rules: 직업명을 코드에 하드코딩하지 않기 위한 매칭 기준 테이블
create table if not exists public.occupation_matching_rules (
  id uuid primary key default gen_random_uuid(),
  occupation_id uuid not null references public.occupations (id) on delete cascade,
  dimension text not null,
  target_value numeric(4,2) not null default 3,
  weight numeric(4,2) not null default 1,
  is_required boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists occupation_matching_rules_occupation_id_idx
  on public.occupation_matching_rules (occupation_id);

-- 9) user_job_interests: 비회원(anonymous_id) 검사 결과도 저장 가능하도록 확장
alter table public.user_job_interests
  alter column user_id drop not null;

alter table public.user_job_interests
  add column if not exists anonymous_id text,
  add column if not exists occupation_name text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.user_job_interests
  drop constraint if exists user_job_interests_user_id_occupation_id_key;

create unique index if not exists user_job_interests_user_occupation_uidx
  on public.user_job_interests (user_id, occupation_id)
  where user_id is not null;

create unique index if not exists user_job_interests_anon_occupation_uidx
  on public.user_job_interests (anonymous_id, occupation_id)
  where anonymous_id is not null;

alter table public.user_job_interests
  add constraint user_job_interests_user_or_anonymous_chk
  check (user_id is not null or anonymous_id is not null);

-- 10) match_results: source_type/source_id 로 방향성(USER<->OCCUPATION 등) 명시
alter table public.match_results
  add column if not exists source_type text not null default 'user',
  add column if not exists source_id text,
  add column if not exists anonymous_id text;

update public.match_results set source_id = user_id::text where source_id is null and user_id is not null;
