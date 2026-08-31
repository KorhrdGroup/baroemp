import type { ActivityEvent } from "./activity-event";
import type { AssessmentResult } from "./assessment";
import type { CareerGapSummary } from "./career-gap";
import type { CareerProfile } from "./career-profile";
import type { CareerContent } from "./content-catalog";
import type { Consultation } from "./consultation";
import type { Lead } from "./lead";
import type { MatchResult } from "./match-result";
import type { Profile, UserAcquisition } from "./profile";
import type { SupportProgram } from "./support-program";
import type { Job } from "./job";

export interface InterestItem {
  id: string;
  label: string;
  score?: number;
  source?: string;
}

export interface JobBehaviorTopItem {
  label: string;
  count: number;
}

/** 관리자 회원상세 "채용 관심" 섹션용 요약 (job-behavior-summary.service.ts에서 생성). */
export interface UserJobBehaviorSummary {
  recentViewCount: number;
  bookmarkCount: number;
  applyClickCount: number;
  topInterestOccupations: JobBehaviorTopItem[];
  topDetailTags: JobBehaviorTopItem[];
  searchKeywords: string[];
  topRegions: JobBehaviorTopItem[];
}

export interface SupportBehaviorTopItem {
  label: string;
  count: number;
}

/** 관리자 회원상세 "지원제도 관심" 섹션용 요약 (support-behavior-summary.service.ts에서 생성). */
export interface UserSupportBehaviorSummary {
  hasCompletedAssessment: boolean;
  lastAssessmentCompletedAt?: string;
  highEligibilityCount: number;
  recentViewCount: number;
  bookmarkCount: number;
  applyClickCount: number;
  topCategories: SupportBehaviorTopItem[];
  topPrograms: SupportBehaviorTopItem[];
  trainingInterest: boolean;
  regionalInterest: boolean;
}

export interface RecommendedItem {
  id: string;
  title: string;
  type: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  reasons: { ruleKey: string; label: string; score: number }[];
}

/**
 * 관리자 회원상세 "이력서/자소서" 섹션 + 마이페이지 요약용 (스펙 38/51번).
 * 이력서 원문은 담지 않고 개수/완성도/최근수정일 등 메타 정보만 노출한다.
 */
export interface UserResumeSummary {
  resumeCount: number;
  primaryResume?: {
    id: string;
    title: string;
    completeness: number;
    desiredJobTitle?: string;
    updatedAt: string;
  };
  /**
   * 가장 최근에 손 본 이력서/자기소개서. 마이페이지에서 "이어서 하기" 줄로 보여준다.
   * 대표 이력서(primaryResume)와는 다른 값일 수 있다 - 대표는 진단·상담이 보는 것이고,
   * 이쪽은 방금 쓰다 만 것이다.
   */
  recentResume?: {
    id: string;
    title: string;
    completeness: number;
    updatedAt: string;
  };
  recentCoverLetter?: {
    id: string;
    title: string;
    updatedAt: string;
  };
  coverLetterCount: number;
  lastCoverLetterUpdatedAt?: string;
  lastAiReviewedAt?: string;
  targetJobIds: string[];
}

export interface UserCrmDetail {
  profile: Profile;
  careerProfile?: CareerProfile;
  lead?: Lead;
  acquisition?: UserAcquisition;
  interestedJobs: InterestItem[];
  heldQualifications: InterestItem[];
  interestedQualifications: InterestItem[];
  interestedContents: InterestItem[];
  activities: ActivityEvent[];
  recommendedContents: RecommendedItem[];
  recommendedJobs: RecommendedItem[];
  recommendedSupports: RecommendedItem[];
  consultations: Consultation[];
  matchResults: MatchResult[];
  assessmentResults: AssessmentResult[];
  jobBehavior: UserJobBehaviorSummary;
  supportBehavior: UserSupportBehaviorSummary;
  resumeSummary: UserResumeSummary;
  /** 취업 준비도(Career Gap) 최근 분석 목록. 마이페이지/관리자 회원상세 공용 (스펙 37/38번) */
  careerGapSummaries: CareerGapSummary[];
}

export interface PotentialCustomerSummary {
  contentId: string;
  contentTitle: string;
  total: number;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  customers: Array<{
    userId: string;
    name: string;
    score: number;
    grade: "A" | "B" | "C" | "D";
    reasons: { ruleKey: string; label: string; score: number }[];
  }>;
}

export interface AnalyticsSnapshot {
  kpis: Array<{ key: string; label: string; value: string }>;
  utmSourceCounts: Array<{ key: string; count: number }>;
  utmCampaignCounts: Array<{ key: string; count: number }>;
  utmCampaignAvgLeadScore: Array<{ key: string; avgScore: number; count: number }>;
}

export type { CareerContent, Job, SupportProgram };
