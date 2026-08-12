import type { AgeGroup, EmploymentStatus, ISODateString, PublishStatus, Region, Tag } from "./common";

/** 외부 지원제도 Provider 식별자. 향후 work24_support/youth_policy 등을 추가할 수 있도록 열어둔다. */
export type SupportProviderName = "public_service" | "mock" | (string & {});

/**
 * 지원제도 카테고리. 결과 페이지의 "카테고리" 그룹핑에 사용한다.
 * 특정 값에 강하게 종속되지 않도록 자유 문자열도 허용한다.
 */
export type SupportCategory =
  | "employment"
  | "training"
  | "living"
  | "regional"
  | "other"
  | (string & {});

/**
 * Support Program: 정부/지자체 취업·훈련·생활 지원사업 도메인.
 *
 * STEP 5에서 "행정안전부 공공서비스(혜택) 정보 OPEN API" 등 외부 Provider 연동을 위해
 * 필드를 대폭 확장했다. 외부 API에 없는 값은 전부 optional로 둔다.
 */
export interface SupportProgram {
  id: string;
  title: string;
  /** 하위호환 필드 - organizationName과 동일한 값을 저장한다 (기존 STEP2 UI 호환용). */
  organization: string;

  summary: string;
  description: string;

  category: SupportCategory;
  supportType: "cash" | "training_voucher" | "insurance" | "tax_benefit" | "other";

  /** 지원대상 서술(자유 텍스트, 예: "만 50세 이상 실업자") */
  targetDescription?: string;
  /** 대상 조건 자유 서술 배열 (하위호환) */
  targetConditions: string[];
  targetAgeGroups: AgeGroup[];
  targetAgeMin?: number;
  targetAgeMax?: number;
  targetRegions?: Region[];
  /** 광역 단위 대표 지역 범위. "national"이면 전국 대상. */
  regionScope?: "national" | Region | (string & {});
  employmentStatusTargets?: EmploymentStatus[];

  /** 소득/재산 조건 - 정확한 판정이 어려워 "확인 필요"로 안내한다. */
  incomeCondition?: string;
  careerCondition?: string;
  householdCondition?: string;
  educationCondition?: string;
  /** 관련 희망직종 조건(자유 서술 또는 jobCategory 코드) */
  jobCondition?: string;

  /** 자격조건 원문 (구조화 Rule과 별개로 항상 원문을 보존한다) */
  eligibilityRaw?: string;

  benefitDescription?: string;
  /** 지원금액/혜택 텍스트 (하위호환: 기존 supportAmountText) */
  supportAmountText?: string;

  applicationPeriod?: string;
  applicationStartAt?: ISODateString;
  applicationEndAt?: ISODateString;
  applicationMethod?: string;
  requiredDocuments?: string[];

  organizationName?: string;
  departmentName?: string;
  contact?: string;

  tags: Tag[];
  relatedJobCategories?: string[];
  /** 미보유 시 Content 추천에 사용하는 관련 자격 코드 (Job.preferredQualifications와 동일한 코드 체계) */
  relatedQualificationCodes?: string[];

  applyStartAt?: ISODateString;
  applyEndAt?: ISODateString;
  applyUrl?: string;
  sourceUrl?: string;

  status: PublishStatus;
  /** 폐지/마감된 지원제도는 삭제 대신 비활성화한다. */
  isActive: boolean;
  closedAt?: ISODateString;

  /** STEP 5: 외부 Provider 연동 시 식별자. 직접등록/Mock 은 "mock" 또는 비어있음. */
  externalSource?: SupportProviderName;
  externalId?: string;
  /** Provider 원본 응답 스냅샷 (감사/재현용) */
  rawPayload?: Record<string, unknown>;
  fetchedAt?: ISODateString;

  /**
   * STEP 5.5: "바로취업에 적합한 지원제도" 관련도 점수(0~100)와 산정 근거.
   * 외부 공공서비스 API에는 취업과 무관한 혜택도 다수 포함되므로, 사용자 노출 시 이 값으로 필터링한다.
   * 원본 데이터는 삭제하지 않고 이 필드로만 구분한다 (src/lib/support/career-relevance.ts 참고).
   */
  careerRelevanceScore?: number;
  careerRelevanceReasons?: string[];

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type SupportProgramInput = Partial<
  Omit<SupportProgram, "id" | "createdAt" | "updatedAt">
> & {
  title: string;
  organization: string;
};

export type SupportSortOrder = "recommended" | "latest" | "deadline";

export interface SupportSearchFilter {
  keyword?: string;
  category?: SupportCategory;
  region?: Region;
  regionScope?: string;
  ageGroup?: AgeGroup;
  employmentStatus?: EmploymentStatus;
  provider?: SupportProviderName;
  status?: PublishStatus;
  /** true(기본값)면 비활성/마감 제도를 제외한다. */
  activeOnly?: boolean;
  /** STEP 5.5: 지정 시 career_relevance_score가 이 값 이상인 지원제도만 포함한다 (관리자 화면에는 적용하지 않음). */
  minCareerRelevanceScore?: number;
  tags?: Tag[];
  sort?: SupportSortOrder;
  page?: number;
  pageSize?: number;
}

export interface SupportSearchResult {
  items: SupportProgram[];
  total: number;
  page: number;
  pageSize: number;
}

/** 지원 가능성 등급. 확정적 표현("받을 수 있습니다")을 피하기 위해 4단계 등급만 사용한다. */
export type SupportEligibilityGrade = "HIGH" | "MEDIUM" | "CHECK_REQUIRED" | "LOW";

export const SUPPORT_ELIGIBILITY_GRADE_LABELS: Record<SupportEligibilityGrade, string> = {
  HIGH: "높은 가능성",
  MEDIUM: "가능성 있음",
  CHECK_REQUIRED: "확인 필요",
  LOW: "낮은 가능성",
};

export const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  employment: "취업지원",
  training: "교육·훈련지원",
  living: "생활지원",
  regional: "지역지원",
  other: "기타",
};
