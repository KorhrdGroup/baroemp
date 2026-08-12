/**
 * Job Behavior -> Career Interest 가중치 규칙.
 *
 * 이 파일은 "설정값"이다. lead/scoring-rules.ts와 동일한 철학으로,
 * 실제 계산 로직(job-interest.service.ts)과 분리해 두어 관리자가 향후
 * 코드 배포 없이 점수 규칙을 조정할 수 있게 한다.
 */
export type JobInterestSignalKey =
  | "JOB_SEARCHED"
  | "JOB_VIEWED"
  | "JOB_VIEWED_REPEAT_BONUS"
  | "JOB_BOOKMARKED"
  | "JOB_APPLY_CLICKED";

export interface JobInterestRule {
  key: JobInterestSignalKey;
  label: string;
  points: number;
  description: string;
}

export const JOB_INTEREST_RULES: Record<JobInterestSignalKey, JobInterestRule> = {
  JOB_SEARCHED: {
    key: "JOB_SEARCHED",
    label: "직접 검색",
    points: 5,
    description: "해당 직종/키워드로 채용공고를 직접 검색한 경우",
  },
  JOB_VIEWED: {
    key: "JOB_VIEWED",
    label: "채용공고 조회",
    points: 2,
    description: "채용공고 상세를 조회한 경우",
  },
  JOB_VIEWED_REPEAT_BONUS: {
    key: "JOB_VIEWED_REPEAT_BONUS",
    label: "같은 직종 반복조회 가중",
    points: 3,
    description: "같은 직종 공고를 3회 이상 반복 조회한 경우 추가로 부여",
  },
  JOB_BOOKMARKED: {
    key: "JOB_BOOKMARKED",
    label: "채용공고 찜",
    points: 8,
    description: "채용공고를 찜한 경우",
  },
  JOB_APPLY_CLICKED: {
    key: "JOB_APPLY_CLICKED",
    label: "지원하러 가기 클릭",
    points: 15,
    description: "지원 페이지로 이동한 경우",
  },
};

/** interest_score의 상한/하한. Assessment 기반 관심도와 동일한 0~100 스케일을 사용한다. */
export const JOB_INTEREST_SCORE_MIN = 0;
export const JOB_INTEREST_SCORE_MAX = 100;

/** 같은 직종(jobCategory) 반복조회로 간주하는 최소 조회 횟수. */
export const JOB_INTEREST_REPEAT_VIEW_THRESHOLD = 3;

export function clampJobInterestScore(score: number): number {
  return Math.max(JOB_INTEREST_SCORE_MIN, Math.min(JOB_INTEREST_SCORE_MAX, Math.round(score)));
}
