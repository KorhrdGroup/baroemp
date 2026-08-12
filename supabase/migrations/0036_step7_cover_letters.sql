-- 0036_step7_cover_letters.sql
-- STEP 7: 자기소개서(Cover Letter) Builder 신규 도메인.

create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete set null,
  target_job_id uuid references public.jobs (id) on delete set null,
  target_occupation_id uuid references public.occupations (id) on delete set null,
  title text not null,
  template_id uuid references public.cover_letter_templates (id),
  status text not null default 'draft',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_cover_letters_updated_at on public.cover_letters;
create trigger trg_cover_letters_updated_at
  before update on public.cover_letters
  for each row execute function public.set_updated_at();

create index if not exists idx_cover_letters_user on public.cover_letters (user_id, updated_at desc);
create index if not exists idx_cover_letters_target_job on public.cover_letters (target_job_id);

create table if not exists public.cover_letter_sections (
  id uuid primary key default gen_random_uuid(),
  cover_letter_id uuid not null references public.cover_letters (id) on delete cascade,
  question_type text not null,
  question text not null,
  content text not null default '',
  character_limit integer,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_cover_letter_sections_updated_at on public.cover_letter_sections;
create trigger trg_cover_letter_sections_updated_at
  before update on public.cover_letter_sections
  for each row execute function public.set_updated_at();

create index if not exists idx_cover_letter_sections_letter on public.cover_letter_sections (cover_letter_id, order_index);
