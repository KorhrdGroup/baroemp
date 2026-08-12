-- 0033_step6_auth_identity_trigger.sql
-- STEP 6: auth.users 생성 시 Career Identity(profiles/user_roles/career_profiles/user_acquisition)를
-- 원자적으로 생성한다 (half-created 상태 방지). role은 항상 'USER'로 고정하여
-- 클라이언트가 raw_user_meta_data에 role을 넣어도 권한 상승이 불가능하게 한다.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_phone text;
  v_marketing boolean;
  v_privacy_consent_at timestamptz;
begin
  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), '');
  v_phone := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');
  v_marketing := coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false);
  v_privacy_consent_at := case
    when new.raw_user_meta_data->>'privacy_consent_at' is not null
      and new.raw_user_meta_data->>'privacy_consent_at' <> ''
    then (new.raw_user_meta_data->>'privacy_consent_at')::timestamptz
    else now()
  end;

  insert into public.profiles (
    id, name, phone, email, role, marketing_consent, marketing_consent_at, privacy_consent_at
  )
  values (
    new.id,
    v_name,
    v_phone,
    new.email,
    'USER',
    v_marketing,
    case when v_marketing then now() else null end,
    v_privacy_consent_at
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'USER')
  on conflict (user_id, role) do nothing;

  insert into public.career_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_acquisition (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 관리자 회원목록 가입일 정렬/페이지네이션용 인덱스 (기존 0014에는 없었음)
create index if not exists idx_profiles_created_at on public.profiles (created_at desc);

-- 이메일 검색(관리자 회원 검색) 대소문자 무관 매칭용
create index if not exists idx_profiles_email_lower on public.profiles (lower(email));
