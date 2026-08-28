-- 0053_cover_letter_experience_bank_ids.sql
-- 자기소개서를 만들 때 고른 "재료 경험"을 자기소개서에 붙여 둔다.
--
-- 지금까지는 편집 화면에서 문항마다 경험뱅크 전체를 늘어놓고 그때그때 골랐다.
-- 경험이 쌓일수록 문항마다 같은 목록을 다시 훑어야 했고, 고른 것은 아무 데도
-- 남지 않아 다시 들어오면 처음부터였다. 작성 시작 단계에서 한 번 고르고
-- 그 선택을 자기소개서에 저장해 편집 내내 쓴다.
--
-- 경험뱅크 항목이 지워져도 자기소개서는 남아야 하므로 FK를 걸지 않는다.
-- 읽는 쪽에서 지금 있는 경험만 추려 쓴다.
alter table public.cover_letters
  add column if not exists experience_bank_ids uuid[] not null default '{}'::uuid[];

comment on column public.cover_letters.experience_bank_ids is
  '작성 시작 단계에서 고른 경험뱅크 항목 id. 편집 화면의 AI 초안 재료 후보로 쓴다.';
