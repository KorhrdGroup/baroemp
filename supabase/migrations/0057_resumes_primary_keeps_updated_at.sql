-- 0057_resumes_primary_keeps_updated_at.sql
--
-- 대표 이력서를 바꾸면 두 행(내려가는 이력서, 올라가는 이력서)이 update 되는데,
-- 공용 트리거 set_updated_at() 이 무조건 updated_at 을 now() 로 밀어버린다.
-- 그래서 목록의 "최근수정"이 손대지도 않은 이력서까지 오늘로 바뀐다.
--
-- 대표 지정은 이력서 내용을 고친 게 아니므로, is_primary 만 달라진 update 에서는
-- updated_at 을 그대로 둔다. 그 외의 update 는 지금까지와 똑같이 동작한다.

create or replace function public.set_resumes_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_primary is distinct from old.is_primary
     and (to_jsonb(new) - 'is_primary' - 'updated_at') = (to_jsonb(old) - 'is_primary' - 'updated_at')
  then
    new.updated_at = old.updated_at;
    return new;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_resumes_updated_at on public.resumes;
create trigger trg_resumes_updated_at
  before update on public.resumes
  for each row execute function public.set_resumes_updated_at();
