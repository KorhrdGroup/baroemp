-- 0064_assessment_age_70plus_desc_order.sql
-- 직업진단 연령대 문항에 "70대 이상" 선택지를 추가하고, 나이 많은 순(70대 이상 → 10대)으로 재배치한다.
-- 주 이용층이 중장년이라 자기 연령대가 목록 위쪽에 와야 스크롤 없이 바로 고를 수 있다.

insert into public.assessment_options (id, question_id, option_text, value, score_map, profile_value, tags, order_index)
values ('b1a04c5e-7d2f-4e8a-9c36-52e08f1a7d90', '68edd59e-64ec-eafc-b14f-08cce3066b66', '70대 이상', '70plus', '{}'::jsonb, '"70plus"'::jsonb, '[]'::jsonb, 1)
on conflict (id) do update set option_text = excluded.option_text, order_index = excluded.order_index;

update public.assessment_options
set order_index = case value
  when '60s' then 2
  when '50s' then 3
  when '40s' then 4
  when '30s' then 5
  when '20s' then 6
  when '10s' then 7
  else order_index
end
where question_id = '68edd59e-64ec-eafc-b14f-08cce3066b66';
