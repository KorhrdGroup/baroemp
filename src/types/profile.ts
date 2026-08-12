import type { ISODateString, Region } from "./common";

export type AppRole = "USER" | "CONSULTANT" | "ADMIN" | "SUPER_ADMIN";

export interface Profile {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  birthYear?: number;
  gender?: string;
  regionSido?: Region | string;
  regionSigungu?: string;
  role: AppRole;
  marketingConsent: boolean;
  marketingConsentAt?: ISODateString;
  privacyConsentAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastActiveAt?: ISODateString;
}

export interface UserAcquisition {
  id: string;
  userId: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage?: string;
  referrer?: string;
  firstTouchAt: ISODateString;
  lastTouchAt: ISODateString;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  ageGroup: string;
  region: string;
  employmentStatus: string;
  signupChannel: string;
  joinedAt: string;
  leadGrade: "A" | "B" | "C" | "D";
  leadScore?: number;
  /** 스펙 24/27번: Primary Interest (Lead.interestedJobLabel과 동일한 값). */
  primaryInterest?: string;
  /** 스펙 31번: Lead Grade와 별개로 표시해야 하는 마케팅 수신 동의 여부. */
  marketingConsent?: boolean;
  lastActiveAt?: string;
  /**
   * 스펙 36번: 개발/시드용 테스트 계정 여부 (email이 `@baro.local`로 끝나는 계정).
   * 0015_seed.sql의 seed01~20@baro.local, 각 e2e/smoke 스크립트가 생성하는 임시 계정이 해당된다.
   * 실제 회원과 구분 표시하기 위한 용도이며, 이 값만으로 데이터를 자동 삭제하지 않는다.
   */
  isTestAccount?: boolean;
}
