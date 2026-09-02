-- 0062_normalize_tag_prefix.sql
-- 태그 저장 표기를 # 없는 쪽으로 통일한다.
--
-- 직업진단은 '#운전가능'처럼 # 를 붙여 저장해 왔는데, 공고 태그(jobs.tags)와
-- 행동 기반으로 승격되는 태그는 '운전배송'처럼 접두사가 없다. 같은 태그가 두 표기로
-- 갈려 있어 관심 태그 가산점(evaluateJobFit)과 콘텐츠 태그 매칭이 발동하지 않았다.
-- 앞으로는 접두사 없이 저장하고(#는 화면에서 붙인다), 이미 쌓인 행도 여기서 벗긴다.

update public.career_profiles
set interest_tags = coalesce(
  (select jsonb_agg(distinct ltrim(t.value, '#')) from jsonb_array_elements_text(interest_tags) as t(value)),
  '[]'::jsonb
)
where exists (
  select 1 from jsonb_array_elements_text(interest_tags) as t(value) where t.value like '#%'
);

update public.assessment_results
set generated_tags = coalesce(
  (select jsonb_agg(distinct ltrim(t.value, '#')) from jsonb_array_elements_text(generated_tags) as t(value)),
  '[]'::jsonb
)
where exists (
  select 1 from jsonb_array_elements_text(generated_tags) as t(value) where t.value like '#%'
);
