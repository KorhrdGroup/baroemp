-- 0067_career_requirements_more_quals.sql
-- 온보딩 자격 목록에 새로 추가된 항목을 요건 사전(career_requirements)에도 보충한다.
-- 이 항목들이 사전에 있어야 공고 원문의 자격 언급을 잡아 배지·매칭이 이어진다.

insert into public.career_requirements
  (key, name, category, description, matching_type, detection_keywords, preparation_difficulty)
values
  (
    'cosmetology_license',
    '종합미용면허',
    'QUALIFICATION',
    '미용·헤어·피부·네일 등 미용 채용에서 요구·우대되는 미용사 국가자격입니다.',
    'QUALIFICATION',
    '["종합미용면허","미용사 자격","미용사자격","미용사(일반)","미용사(피부)","미용사(네일)","미용사(메이크업)","미용면허"]'::jsonb,
    'MEDIUM'
  ),
  (
    'psychology_counselor',
    '심리상담사',
    'QUALIFICATION',
    '상담·복지 채용에서 요구·우대되는 심리상담 관련 자격입니다.',
    'QUALIFICATION',
    '["심리상담사","심리상담","임상심리사","상담심리사"]'::jsonb,
    'MEDIUM'
  )
on conflict (key) do update set
  name = excluded.name,
  detection_keywords = excluded.detection_keywords,
  updated_at = now();
