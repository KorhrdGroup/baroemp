-- 0066_career_requirements_assessment_quals.sql
-- 요건 사전(career_requirements)에 직업진단 자격 목록의 빠진 항목을 보충한다.
--
-- 진단 추천 직업(보육교사·사서·청소년지도사 등)의 공고가 "자격 따면 열리는" 영역에
-- 뜨는데, 사전에 해당 자격이 없어 카드 배지는 "자격 요건 없음"으로 나왔다 - 섹션 제목과
-- 배지가 서로 다른 말을 하는 상태. 탐지는 공고 원문에서 실시간으로 하므로 사전에
-- 항목을 넣는 것만으로 배지·지금 지원가능 판정에 바로 반영된다.
-- (1종 보통 운전면허는 기존 driving_available(DRIVING_FLAG)이 이미 담당한다)

insert into public.career_requirements
  (key, name, category, description, matching_type, detection_keywords, preparation_difficulty)
values
  (
    'childcare_teacher_level_2',
    '보육교사 2급',
    'QUALIFICATION',
    '어린이집 보육교사 채용에서 요구되는 보육교사 자격입니다.',
    'QUALIFICATION',
    '["보육교사 2급","보육교사2급","보육교사 자격","보육교사자격","보육교사"]'::jsonb,
    'HIGH'
  ),
  (
    'disabled_infant_childcare_teacher',
    '장애영유아보육교사',
    'QUALIFICATION',
    '장애영유아 전문 어린이집·통합반 채용에서 요구되는 자격입니다.',
    'QUALIFICATION',
    '["장애영유아보육교사","장애영유아 보육교사","장애영유아를 위한 보육교사"]'::jsonb,
    'HIGH'
  ),
  (
    'librarian_certificate',
    '정사서(준사서)',
    'QUALIFICATION',
    '도서관 사서 채용에서 요구되는 정사서·준사서 자격입니다.',
    'QUALIFICATION',
    '["정사서","준사서","사서자격","사서 자격증","사서자격증"]'::jsonb,
    'HIGH'
  ),
  (
    'youth_counselor_level_2',
    '청소년지도사 2급',
    'QUALIFICATION',
    '청소년 기관·시설 채용에서 요구되는 청소년지도사 자격입니다.',
    'QUALIFICATION',
    '["청소년지도사 2급","청소년지도사2급","청소년지도사"]'::jsonb,
    'MEDIUM'
  ),
  (
    'lifelong_education_teacher_level_2',
    '평생교육사 2급',
    'QUALIFICATION',
    '평생교육 기관 채용에서 요구되는 평생교육사 자격입니다.',
    'QUALIFICATION',
    '["평생교육사 2급","평생교육사2급","평생교육사"]'::jsonb,
    'MEDIUM'
  ),
  (
    'security_supervisor',
    '경비지도사',
    'QUALIFICATION',
    '경비·보안 관리 채용에서 요구되는 경비지도사 자격입니다.',
    'QUALIFICATION',
    '["경비지도사"]'::jsonb,
    'MEDIUM'
  ),
  (
    'career_counselor_level_2',
    '직업상담사 2급',
    'QUALIFICATION',
    '취업지원·직업상담 채용에서 요구되는 직업상담사 자격입니다.',
    'QUALIFICATION',
    '["직업상담사 2급","직업상담사2급","직업상담사"]'::jsonb,
    'MEDIUM'
  ),
  (
    'computer_literacy_certificate',
    '컴퓨터활용능력',
    'QUALIFICATION',
    '사무 채용에서 요구·우대되는 컴퓨터활용능력 자격입니다.',
    'QUALIFICATION',
    '["컴퓨터활용능력","컴활"]'::jsonb,
    'LOW'
  )
on conflict (key) do update set
  name = excluded.name,
  detection_keywords = excluded.detection_keywords,
  updated_at = now();
