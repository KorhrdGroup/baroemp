import type {
  AgeGroup,
  EmploymentStatus,
  Region,
  SupportCategory,
  SupportProviderName,
  SupportRuleField,
  SupportRuleOperator,
  SupportRuleType,
} from "@/types";

export type { SupportProviderName };

/**
 * External Support Program Provider Architecture.
 *
 * 특정 API(예: 행안부 공공서비스 정보) 하나에 코드 전체가 종속되지 않도록,
 * 모든 외부 지원제도 Provider는 이 인터페이스만 구현하면 Support Sync Service /
 * Support Search Service에서 동일하게 사용할 수 있다 (features/jobs/providers와 동일한 철학).
 *
 * 향후 WORK24_SUPPORT / WORK24_TRAINING / YOUTH_POLICY / LOCAL_GOVERNMENT / PRIVATE_WELFARE 등을
 * 추가할 때는 이 폴더에 provider 파일을 하나 더 만들고 index.ts에 등록하기만 하면 된다.
 */

/** Provider가 알고 있는 경우에만 제공하는 구조화 Rule 힌트. 모르면 생략하고 eligibilityRaw만 채운다. */
export interface NormalizedSupportProgramRule {
  field: SupportRuleField;
  operator: SupportRuleOperator;
  value: unknown;
  weight?: number;
  isRequired?: boolean;
  ruleType?: SupportRuleType;
}

/**
 * NormalizedSupportProgram: External Response -> Adapter를 거쳐 나온 내부 표준 지원제도 모델.
 * support_programs 테이블/SupportProgram 도메인 타입과 1:1에 가깝게 맞추되,
 * Provider 응답에 없는 필드는 모두 nullable이다.
 */
export interface NormalizedSupportProgram {
  externalSource: SupportProviderName;
  externalId: string;

  title: string;
  organizationName: string;
  /** 원본 "소관기관유형" (시군구/광역시도/중앙행정기관/공공기관/지방출자_출연기관/지방공기업/교육청) */
  organizationType?: string;
  departmentName?: string;

  summary?: string;
  description?: string;

  category?: SupportCategory;
  /** gov24 사용자구분 기반 수혜 주체 (personal/business/both) */
  audience?: "personal" | "business" | "both";
  supportType?: "cash" | "training_voucher" | "insurance" | "tax_benefit" | "other";

  targetDescription?: string;
  targetAgeGroups?: AgeGroup[];
  targetAgeMin?: number;
  targetAgeMax?: number;
  regionScope?: "national" | Region | (string & {});
  employmentStatusTargets?: EmploymentStatus[];

  incomeCondition?: string;
  careerCondition?: string;
  householdCondition?: string;
  educationCondition?: string;
  jobCondition?: string;

  eligibilityRaw?: string;
  /** Provider가 대상조건을 구조화해서 알고 있는 경우에만 채운다 (모르면 undefined -> raw text만 사용). */
  rules?: NormalizedSupportProgramRule[];

  benefitDescription?: string;
  supportAmountText?: string;

  applicationPeriod?: string;
  applicationStartAt?: string;
  applicationEndAt?: string;
  applicationMethod?: string;
  requiredDocuments?: string[];
  contact?: string;

  tags?: string[];
  relatedJobCategories?: string[];
  relatedQualificationCodes?: string[];

  sourceUrl?: string;

  isActive: boolean;

  /** Provider 원본 응답 스냅샷 (감사/재파싱용) */
  rawPayload: Record<string, unknown>;
  fetchedAt: string;

  /** STEP 5.5: Support Sync Service가 채워준다 (Provider가 직접 계산하지 않아도 됨). */
  careerRelevanceScore?: number;
  careerRelevanceReasons?: string[];
}

export interface SupportProviderSearchParams {
  keyword?: string;
  category?: string;
  region?: string;
  page: number;
  pageSize: number;
}

export interface SupportProviderSearchResult {
  programs: NormalizedSupportProgram[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SupportProvider {
  getProviderName(): SupportProviderName;
  searchPrograms(params: SupportProviderSearchParams): Promise<SupportProviderSearchResult>;
  getProgramDetail(externalId: string): Promise<NormalizedSupportProgram | null>;
}
