import type { SupportProgram } from "@/types";

/**
 * Support Interest Tag 규칙 (STEP5 스펙 [17]).
 *
 * Job의 세부 태그(job-tag-rules.ts)와 달리, 지원제도는 카테고리/대상 연령대 단위로만
 * "관심사"를 추론한다 (제목 키워드보다 카테고리가 더 신뢰할 수 있는 신호이기 때문).
 * 반복 조회 횟수가 SUPPORT_TAG_REPEAT_THRESHOLD 이상이면 CareerProfile.interestTags에 반영한다
 * (job-interest.service.ts의 세부 태그 승격 로직과 동일한 철학 — 범용 Tag 시스템 재사용).
 */
export interface SupportTagRule {
  tag: string;
  matches: (program: SupportProgram) => boolean;
}

export const SUPPORT_TAG_RULES: SupportTagRule[] = [
  { tag: "교육지원관심", matches: (p) => p.category === "training" },
  { tag: "취업지원관심", matches: (p) => p.category === "employment" },
  { tag: "지역지원관심", matches: (p) => p.category === "regional" },
  { tag: "생활지원관심", matches: (p) => p.category === "living" },
  {
    tag: "중장년지원관심",
    matches: (p) => (p.targetAgeGroups ?? []).some((g) => g === "50s" || g === "60s" || g === "70plus"),
  },
];

/** 지원제도 조회 행동에서 매칭되는 관심 태그를 추출한다 (중복 제거). */
export function extractSupportInterestTags(program: SupportProgram): string[] {
  return [...new Set(SUPPORT_TAG_RULES.filter((rule) => rule.matches(program)).map((rule) => rule.tag))];
}

/** 관심 태그로 승격되기 전, 같은 태그가 몇 번 이상 등장해야 하는지 (반복조회 기준). */
export const SUPPORT_TAG_REPEAT_THRESHOLD = 2;
