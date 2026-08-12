import type { ISODateString } from "./common";

/**
 * User Job Interest: 사용자가 관심을 보인 직업(occupation) 목록.
 * 검사 결과 TOP 직업뿐 아니라 이후 조회 행동으로도 갱신될 수 있도록 source를 남긴다.
 */
export type JobInterestSource = "ASSESSMENT" | "MANUAL" | "VIEW_BEHAVIOR" | "JOB_BEHAVIOR";

export interface UserJobInterest {
  id: string;
  userId?: string;
  anonymousId?: string;
  occupationId: string;
  occupationName: string;
  interestScore: number;
  source: JobInterestSource | (string & {});
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type UserJobInterestUpsertInput = Omit<UserJobInterest, "id" | "createdAt" | "updatedAt">;
