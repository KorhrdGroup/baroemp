/**
 * Lead Scoring Rules
 *
 * 이 파일은 "설정값"의 역할을 한다. 실제 점수 계산 로직(scoring-engine.ts)과
 * 분리해 둔 이유는, 향후 관리자 화면에서 이 값을 DB(Supabase)에 저장하고
 * 코드 배포 없이 점수 규칙을 조정할 수 있도록 하기 위함이다.
 *
 * 규칙을 추가/변경하려면 이 배열만 수정하면 되고, scoring-engine.ts는
 * "정의된 규칙을 순회해서 합산"하는 역할만 하므로 수정할 필요가 없다.
 */
export interface LeadScoringRule {
  /** LeadSignalInput의 key와 매칭되는 고유 식별자 */
  key: string;
  label: string;
  description: string;
  points: number;
}

export const LEAD_SCORING_RULES: LeadScoringRule[] = [
  {
    key: "wants_job_within_3_months",
    label: "3개월 이내 취업 희망",
    description: "희망 취업시기가 3개월 이내인 경우",
    points: 20,
  },
  {
    key: "repeated_same_category_job_views",
    label: "같은 직종 채용공고 반복조회",
    description: "동일 직종 채용공고를 반복적으로 조회한 경우",
    points: 15,
  },
  {
    key: "resume_review_completed",
    label: "이력서 첨삭 완료",
    description: "이력서 또는 자소서 첨삭을 완료한 경우",
    points: 15,
  },
  {
    key: "support_program_checked",
    label: "지원금 조회",
    description: "지원금 상세 정보를 조회한 경우",
    points: 10,
  },
  {
    key: "missing_qualification_with_course_available",
    label: "자격증 미보유 + 관련 과정 존재",
    description: "관심 직종에 필요한 자격증이 없고 연계 가능한 과정이 있는 경우",
    points: 10,
  },
  {
    key: "consultation_requested",
    label: "상담신청",
    description: "1:1 취업컨설팅 상담을 신청한 경우",
    points: 30,
  },
  {
    key: "active_within_7_days",
    label: "최근 7일 내 활동",
    description: "최근 7일 이내 서비스 이용 활동이 있는 경우",
    points: 10,
  },
  {
    key: "assessment_completed",
    label: "직업검사 완료",
    description: "내게 맞는 직업 찾기 검사를 완료한 경우",
    points: 10,
  },
  {
    key: "high_training_willingness",
    label: "교육 준비 의향 높음",
    description: "검사 결과 교육/자격 준비 의향이 높게 나타난 경우",
    points: 10,
  },
  {
    key: "high_occupation_fit",
    label: "고적합도 추천 직업 존재",
    description: "검사 결과 적합도 85점 이상인 추천 직업이 있는 경우",
    points: 10,
  },
  // STEP 4: 채용공고 행동 기반 신호. job-interest.service.ts / signal-builder.ts에서 계산한다.
  {
    key: "job_bookmark_exists",
    label: "채용공고 찜",
    description: "채용공고를 1건 이상 찜한 경우",
    points: 10,
  },
  {
    key: "job_apply_clicked_recent",
    label: "채용공고 지원 클릭",
    description: "최근 지원하러 가기를 클릭한 경우",
    points: 15,
  },
  {
    key: "active_job_search_within_7_days",
    label: "최근 7일 적극적 채용 탐색",
    description: "최근 7일 이내 채용공고 검색/조회 활동이 활발한 경우",
    points: 10,
  },
  {
    key: "missing_qualification_high_job_interest",
    label: "자격 미보유 + 높은 직업 관심",
    description: "관심 직종에 필요한 자격이 없고, 해당 직종에 대한 관심도(Job Behavior)가 높은 경우",
    points: 10,
  },
  // STEP 5: 지원금(Support Program) 행동 기반 신호. support-*.service.ts / signal-builder.ts에서 계산한다.
  {
    key: "support_assessment_completed",
    label: "지원금 검사 완료",
    description: "지원금 찾기 진단을 완료한 경우",
    points: 10,
  },
  {
    key: "support_detail_repeated_view",
    label: "지원제도 상세 반복조회",
    description: "동일 지원제도 상세를 3회 이상 반복 조회한 경우",
    points: 5,
  },
  {
    key: "support_training_interest",
    label: "훈련지원 관련 조회",
    description: "직업훈련 관련 지원제도를 반복적으로 조회한 경우",
    points: 5,
  },
  {
    key: "support_apply_clicked_recent",
    label: "지원제도 신청페이지 클릭",
    description: "최근 7일 이내 지원제도 공식 신청페이지를 클릭한 경우",
    points: 10,
  },
  // STEP 7: 이력서/자기소개서 Builder 행동 기반 신호. resume-signal-builder에서 계산한다.
  {
    key: "resume_created",
    label: "이력서 작성 시작",
    description: "이력서를 1건 이상 생성한 경우",
    points: 5,
  },
  {
    key: "resume_completed",
    label: "이력서 완성",
    description: "완성도 80% 이상인 이력서가 1건 이상 있는 경우",
    points: 10,
  },
  {
    key: "resume_ai_reviewed",
    label: "이력서 AI 첨삭 이용",
    description: "AI 이력서 점검 기능을 사용한 경우",
    points: 5,
  },
  {
    key: "cover_letter_created",
    label: "자기소개서 작성",
    description: "자기소개서를 1건 이상 작성한 경우",
    points: 10,
  },
  {
    key: "target_job_selected",
    label: "지원공고 연결",
    description: "이력서/자기소개서를 특정 채용공고에 맞춰 준비하는 경우",
    points: 5,
  },
  {
    key: "resume_recently_updated",
    label: "최근 이력서 수정",
    description: "최근 7일 이내 이력서를 수정한 경우",
    points: 5,
  },
  // STEP 7.5: Career Gap Engine 행동 기반 신호. career-gap-actions.ts / signal-builder.ts에서 계산한다.
  // Gap 분석 자체가 높은 구직의도 신호이지만, 과도한 중복 점수를 막기 위해 각 항목을 낮은 배점(5점)으로 유지한다 (스펙 43번).
  {
    key: "career_gap_completed",
    label: "취업 준비도 분석 완료",
    description: "희망 직업/취업처 대비 취업 준비도(Career Gap) 분석을 완료한 경우",
    points: 5,
  },
  {
    key: "high_gap_training_interest",
    label: "준비도 보완 콘텐츠 관심 높음",
    description: "취업 준비도 분석 결과에서 추천된 자격/실무교육 콘텐츠를 2건 이상 확인한 경우",
    points: 5,
  },
  {
    key: "gap_recommended_content_clicked",
    label: "준비도 추천 콘텐츠 클릭",
    description: "취업 준비도 분석 결과에서 추천된 콘텐츠(준비방법)를 클릭한 경우",
    points: 5,
  },
];

/** 총점 기준 등급 경계값. 관리자가 향후 조정 가능하도록 별도 상수로 분리. */
export const LEAD_GRADE_THRESHOLDS: { grade: "A" | "B" | "C" | "D"; minScore: number }[] = [
  { grade: "A", minScore: 60 },
  { grade: "B", minScore: 40 },
  { grade: "C", minScore: 20 },
  { grade: "D", minScore: 0 },
];

export function getLeadScoringRule(key: string): LeadScoringRule | undefined {
  return LEAD_SCORING_RULES.find((rule) => rule.key === key);
}
