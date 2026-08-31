import type { AgeGroup, ISODateString, PublishStatus, Region, Tag, WorkType } from "./common";

/** 외부 채용정보 Provider 식별자. 향후 saramin/local_government 등을 추가할 수 있도록 열어둔다. */
export type JobProviderName = "work24" | "mock" | (string & {});

/** 임금 형태 (Work24: D=일급, H=시급, M=월급, Y=연봉) */
export type SalaryType = "daily" | "hourly" | "monthly" | "annual" | (string & {});

/** 경력 요건 (Work24: N=신입, E=경력, Z=관계없음) */
export type CareerRequirement = "new" | "experienced" | "any" | (string & {});

/**
 * Job: 채용공고 도메인.
 * 특정 직업을 코드에 하드코딩하지 않고 jobCategory(자유 코드) + tags로 분류한다.
 *
 * STEP 4에서 외부 Provider(고용24 Work24 등) 연동을 위해 필드를 확장했다.
 * Provider 원본 응답에 없는 필드는 전부 optional로 둔다.
 */
export interface Job {
  id: string;
  title: string;
  companyName: string;
  /** 사업자등록번호 (Work24: busino) */
  businessRegistrationNumber?: string;
  /** 업종명 (Work24: indTpNm) */
  industryName?: string;

  /** 직업 분류 코드 (예: "care_worker", "logistics" 등). 관리자가 자유롭게 추가 가능. */
  jobCategory: string;
  /** Occupation/Work24 직종코드 (jobCategory와 별개로 원본 코드를 보존) */
  occupationCode?: string;
  occupationName?: string;
  /** STEP 7.5: Career Gap Engine의 Job -> Destination 분류 결과 (employment_destinations.id) */
  employmentDestinationId?: string;

  region: Region;
  /** 시/군/구 단위 세부 지역 (자유 문자열, Work24 원본 지역 텍스트에서 파싱) */
  regionSigungu?: string;
  /** 상세 근무지 주소(자유 문자열) */
  locationDetail?: string;
  address?: string;
  zipCode?: string;

  workType: WorkType;
  /** Work24 고용형태 코드 (10/11/20/21 등). Normalize 시 workType으로도 매핑하되 원본 코드를 보존한다. */
  employmentTypeCode?: string;

  salaryType?: SalaryType;
  salaryMin?: number;
  salaryMax?: number;
  salaryText?: string;

  /** 신입/경력 무관 가능 여부 - 중장년 재취업 핵심 필터 */
  isBeginnerFriendly: boolean;
  careerRequirement?: CareerRequirement;
  educationRequirement?: string;
  /** 나이 제한 없음/특정 연령대 우대 여부를 표현 */
  recommendedAgeGroups?: AgeGroup[];
  /**
   * Work24 pfPreferential 코드 (중장년 특화 우대조건).
   * 예: "14" = 운전가능자, "B" = (준)고령자(50세 이상).
   * 코드값을 그대로 보존해 향후 필터/추천에 활용한다.
   */
  preferentialCodes?: string[];

  workHours?: string;
  workDays?: string;

  /** 우대/필요 자격 - Content.id 참조 가능 */
  preferredQualifications: string[];
  /** 필요 자격요건 (원문, Work24에는 없을 수 있음 - 관리자/직접등록용) */
  qualificationRequirements?: string;
  /** 우대 태그(운전가능, 체력요구 낮음 등) + Work24 지역/직무 키워드에서 추출한 세부 태그 */
  tags: Tag[];

  description: string;
  requirements?: string;
  benefits?: string;

  /** 중장년 추천도 (0~5) - Mock 단계에서는 정적 값, 이후 Matching Engine 점수로 대체 */
  midlifeRecommendationScore?: number;

  postedAt?: ISODateString;
  applyDeadline?: ISODateString;
  status: PublishStatus;
  /** 마감/Provider에서 사라짐 등으로 더 이상 노출하지 않을 때 false. 삭제 대신 비활성화한다. */
  isActive: boolean;
  closedAt?: ISODateString;

  source?: "direct" | "partner" | "public_job_board";
  /** 원본 공고 상세 URL (지원하러 가기) */
  sourceUrl?: string;
  mobileSourceUrl?: string;

  /** STEP 4: 외부 채용공고 API 연동 시 Provider 식별자 (예: "work24"). direct/partner는 비어있음. */
  externalSource?: string;
  /** STEP 4: Provider 측 원본 공고 ID. (externalSource, externalId) 조합으로 중복 수집을 방지한다. */
  externalId?: string;
  /** STEP 4: Provider 원본 응답 스냅샷. Normalize 로직 감사/재현용. */
  rawPayload?: Record<string, unknown>;
  /** STEP 4: 외부 API에서 마지막으로 가져온 시각. */
  fetchedAt?: ISODateString;
  /** Work24 smodifyDtm 등 원본 소스의 최종 수정시각 */
  sourceUpdatedAt?: ISODateString;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type JobInput = Partial<Omit<Job, "id" | "createdAt" | "updatedAt">> & {
  title: string;
  companyName: string;
};

export type JobSortOrder = "recommended" | "latest" | "deadline" | "salary_desc";

export interface JobSearchFilter {
  keyword?: string;
  jobCategory?: string;
  /**
   * 직종 코드 앞자리 목록. 한 직종이 코드 여러 개로 흩어져 있어(5501xx = 요양보호사)
   * 앞자리로 훑는다. 여러 직종을 고르면 그중 하나라도 걸리는 공고를 찾는다.
   */
  jobCategoryPatterns?: string[];
  occupationCode?: string;
  employmentDestinationId?: string;
  region?: Region;
  regionSigungu?: string;
  /** 여러 시·군·구를 한 번에 고른 경우. 같은 시·도 안에서만 고를 수 있다. */
  regionSigungus?: string[];
  workType?: WorkType;
  employmentTypeCode?: string;
  isBeginnerFriendly?: boolean;
  careerRequirement?: CareerRequirement;
  salaryMin?: number;
  salaryMax?: number;
  /** 마감일이 이 일수 이내인 공고만 (마감임박 필터) */
  closingWithinDays?: number;
  /** 중장년 우대(Work24 pfPreferential) 코드 필터. 예: ["14","B"] */
  preferentialCodes?: string[];
  tags?: Tag[];
  /** true(기본값)면 마감되지 않은 공고만 검색한다. false를 명시하면 비활성 공고도 포함. */
  activeOnly?: boolean;
  sort?: JobSortOrder;
  page?: number;
  pageSize?: number;
}

export interface JobSearchResult {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Job Role: 개별 채용공고(Job)가 아닌 "직업/직종" 단위의 요약 정보.
 * 홈페이지 "인기 직업" 섹션 등에서 사용하며, jobCategory 코드로 Job/Content와 연결된다.
 * 특정 직업을 코드에 하드코딩하지 않기 위해 항상 배열(mock) 기반으로 렌더링한다.
 */
export interface JobRoleSummary {
  id: string;
  jobCategory: string;
  name: string;
  shortDescription: string;
  isBeginnerFriendly: boolean;
  relatedQualifications: string[];
  /** 0~5 중장년 추천도 */
  midlifeRecommendationScore: number;
  openPositionCount: number;
  averageSalaryText: string;
  tags: Tag[];
}

/** 채용공고 큐레이션 섹션의 탭 종류 (설계: docs/superpowers/specs/2026-08-27-job-curation-section-design.md). */
export type JobCurationTab = "new" | "closing_soon" | "matched" | "ready_to_apply" | "unlockable";

/**
 * 큐레이션 탭 상태.
 * READY: 정상 결과 있음, NEEDS_PROFILE: 커리어 프로필 미입력, EMPTY: 조건 만족 공고 없음.
 */
export type JobCurationState = "READY" | "NEEDS_PROFILE" | "EMPTY";

/** 공고의 필수 자격 대비 회원의 준비 상태. 계산은 features/jobs/job-readiness. */
export type JobReadinessLevel = "no_requirement" | "satisfied" | "preferred" | "near" | "gap";

export interface JobReadiness {
  level: JobReadinessLevel;
  /** 배지에 그대로 쓰는 문구. 계산 내용을 그대로 적어 배지 자체가 근거가 되게 한다. */
  label: string;
}

/** 큐레이션 탭에 노출되는 개별 공고 항목. matchScore/matchGrade는 개인화 탭에서만, unlockRequirementName은 자격 탭에서만 채워진다. */
export interface JobCurationItem {
  job: Job;
  /** 서버에서 계산해 실어 보내는 자격 배지. 요건 사전이 필요해 화면에서 못 만든다. */
  readiness?: JobReadiness;
  matchScore?: number;
  matchGrade?: string;
  /** "희망 직종 일치"처럼 무엇이 맞았는지. 점수 숫자 대신 카드에 이걸 보여준다. */
  matchReasonLabel?: string;
  unlockRequirementName?: string;
}

/** getJobCuration의 반환 타입. */
export interface JobCurationResult {
  tab: JobCurationTab;
  state: JobCurationState;
  items: JobCurationItem[];
}
