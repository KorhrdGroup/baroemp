import type { ISODateString } from "./common";

/**
 * 지원 상태. 지원은 외부 사이트에서 이뤄져 우리가 확인할 수 없으므로 회원이 직접 표시한다.
 * applied → interview → hired 순서로 올라간다.
 */
export type JobApplicationStatus = "applied" | "interview" | "hired";

export const JOB_APPLICATION_STATUS_ORDER: JobApplicationStatus[] = ["applied", "interview", "hired"];

export const JOB_APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  applied: "지원 완료",
  interview: "면접 진행",
  hired: "취업 성공",
};

/** Job Application: 회원이 직접 표시한 공고별 지원 상태. 공고 하나에 한 줄. */
export interface JobApplication {
  id: string;
  userId: string;
  jobId: string;
  status: JobApplicationStatus;
  /** 회원이 마지막으로 상태를 표시한 시각 */
  reportedAt: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
