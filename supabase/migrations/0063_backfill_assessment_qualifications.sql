-- 0063_backfill_assessment_qualifications.sql
-- 과거 직업진단에서 답한 보유 자격을 Career DB(user_qualifications)로 소급 승격한다.
--
-- 진단의 보유 자격 답변은 assessment_results.extracted_profile JSON에만 저장되어 왔고
-- user_qualifications로는 옮겨지지 않았다. 공고 자격 배지·"지금 지원가능" 판정은
-- user_qualifications만 읽으므로, 이미 진단을 마친 회원의 답변이 매칭에 전혀 반영되지
-- 않았다. 앞으로는 진단 완료 시점에 코드가 승격하고(career-profile-merge.service.ts),
-- 이미 쌓인 결과는 여기서 한 번에 옮긴다.

with valid_names as (
  select distinct ar.user_id, trim(t.value) as name
  from public.assessment_results ar
  cross join lateral jsonb_array_elements_text(ar.extracted_profile -> 'heldQualifications') as t(value)
  where ar.user_id is not null
    and jsonb_typeof(ar.extracted_profile -> 'heldQualifications') = 'array'
    and trim(t.value) <> ''
),
created as (
  -- 카탈로그에 없는 이름은 새로 만든다 (upsertFromAssessment의 find-or-create와 동일).
  insert into public.qualifications (name, type, status)
  select distinct vn.name, 'assessment_added', 'active'
  from valid_names vn
  where not exists (select 1 from public.qualifications q where q.name = vn.name)
  returning id, name
),
catalog as (
  -- 이름이 중복 등록된 카탈로그 행이 있어도 한 건으로만 잇는다.
  select distinct on (name) id, name
  from (
    select id, name from public.qualifications
    union all
    select id, name from created
  ) merged
)
insert into public.user_qualifications (user_id, qualification_id, status, source)
select vn.user_id, c.id, 'held', 'ASSESSMENT'
from valid_names vn
join catalog c on c.name = vn.name
on conflict (user_id, qualification_id) do nothing;
