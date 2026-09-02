/**
 * User Activity Event: 모든 사용자 행동을 기록하기 위한 범용 이벤트 구조.
 *
 * eventType을 완전히 폐쇄된 union으로 두지 않는다.
 * 자주 쓰는 값에는 자동완성을 제공하기 위해 KnownActivityEventType을 별도로 두고,
 * 실제 타입은 string으로 열어 향후 새로운 이벤트가 코드 수정 없이 추가될 수 있게 한다.
 */
export const KNOWN_ACTIVITY_EVENT_TYPES = [
  "assessment_started",
  "assessment_section_completed",
  "assessment_answered",
  "assessment_completed",
  "assessment_result_viewed",
  "occupation_result_clicked",
  "content_recommendation_clicked",
  "anonymous_identity_linked",
  "job_detail_viewed",
  "job_search_performed",
  "job_filter_changed",
  "job_bookmarked",
  "job_unbookmarked",
  "job_apply_clicked",
  // 회원이 직접 표시한 지원·면접·취업 (외부 지원이라 실제 여부는 확인 불가)
  "job_application_reported",
  "job_recommendation_viewed",
  "job_recommendation_clicked",
  "support_program_checked",
  "support_program_detail_viewed",
  "support_search_started",
  "support_search_completed",
  "support_viewed",
  "support_filter_changed",
  "support_match_viewed",
  "support_bookmarked",
  "support_unbookmarked",
  "support_apply_clicked",
  "resume_uploaded",
  "resume_review_requested",
  "cover_letter_review_requested",
  "content_viewed",
  "consultation_requested",
  "consultation_completed",
  "interested_job_changed",
  "qualification_interest_added",
  "content_interest_added",
  "signup_started",
  "signup_completed",
  "login_completed",
  "logout",
  "profile_updated",
  "password_reset_requested",
  "find_id_completed",
  "password_reset_completed",
  // STEP 7: 이력서/자기소개서 Builder
  "resume_created",
  "resume_updated",
  "resume_completed",
  "resume_template_selected",
  "resume_ai_reviewed",
  "resume_section_ai_rewritten",
  "resume_exported",
  "cover_letter_created",
  "cover_letter_updated",
  "cover_letter_ai_generated",
  "cover_letter_ai_reviewed",
  "target_job_selected",
  // STEP 7.5: Career Gap Engine (취업 준비도 분석)
  "career_gap_analysis_started",
  "career_gap_analysis_completed",
  "career_gap_item_viewed",
  "career_gap_recommendation_clicked",
  "career_gap_content_clicked",
  "career_gap_job_clicked",
  "career_gap_simulation_viewed",
  "curation_tab_viewed",
  "curation_job_clicked",
] as const;

export type KnownActivityEventType = (typeof KNOWN_ACTIVITY_EVENT_TYPES)[number];

/** 자동완성은 제공하되, 새로운 문자열도 허용하는 열린 타입. */
export type ActivityEventType = KnownActivityEventType | (string & {});

export type ActivityEntityType =
  | "job"
  | "content"
  | "support_program"
  | "assessment"
  | "resume"
  | "cover_letter"
  | "experience_bank"
  | "consultation"
  | "career_profile"
  | "career_gap_analysis"
  | (string & {});

/**
 * 명세서(spec)에서 정의한 형태를 그대로 따른다.
 * occurredAt은 ISO-8601 문자열로, 이벤트 발생 시각을 표현한다.
 *
 * userId/anonymousId는 명시적으로 분리한다.
 * 비회원 이벤트에 anonymousId를 userId 자리에 채우면 안 된다
 * (activity_events.user_id는 uuid FK이므로 문자열 anonymous_id를 넣으면 Supabase Mode에서 실패한다).
 */
export interface ActivityEvent {
  id: string;
  userId?: string;
  anonymousId?: string;
  sessionId?: string;
  eventType: ActivityEventType;
  entityType?: ActivityEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

/** 이벤트 기록 시 id/occurredAt은 로거가 채워주므로 생략 가능하게 한다. */
export type ActivityEventInput = Omit<ActivityEvent, "id" | "occurredAt"> & {
  occurredAt?: string;
};
