-- 0004_content_catalog.sql
-- Career Content Catalog + Recommendation Rules (관리자 설정형)

create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  type text not null,
  category text,
  description text not null default '',
  short_description text,
  price integer not null default 0,
  is_paid boolean not null default false,
  status text not null default 'draft',
  thumbnail_url text,
  provider text,
  related_jobs jsonb not null default '[]'::jsonb,
  target_age_groups jsonb not null default '[]'::jsonb,
  target_conditions jsonb not null default '[]'::jsonb,
  required_qualifications jsonb not null default '[]'::jsonb,
  recommendation_rules jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_tags (
  content_id uuid not null references public.contents (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (content_id, tag_id)
);

create table if not exists public.content_recommendation_rules (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  field text not null,
  operator text not null,
  value jsonb not null default 'null'::jsonb,
  weight integer not null default 10,
  is_required boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- user_content_interests FK (contents 생성 후)
alter table public.user_content_interests
  drop constraint if exists user_content_interests_content_id_fkey;

alter table public.user_content_interests
  add constraint user_content_interests_content_id_fkey
  foreign key (content_id) references public.contents (id) on delete cascade;

alter table public.user_content_interests
  drop constraint if exists user_content_interests_user_id_content_id_key;

alter table public.user_content_interests
  add constraint user_content_interests_user_id_content_id_key
  unique (user_id, content_id);

drop trigger if exists trg_contents_updated_at on public.contents;
create trigger trg_contents_updated_at
  before update on public.contents
  for each row execute function public.set_updated_at();
