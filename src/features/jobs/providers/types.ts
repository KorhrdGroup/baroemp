import type { AgeGroup, JobProviderName, Region } from "@/types";

export type { JobProviderName };

/**
 * External Job Provider Architecture.
 *
 * 특정 API(예: 고용24 Work24) 하나에 코드 전체가 종속되지 않도록,
 * 모든 외부 채용정보 Provider는 이 인터페이스만 구현하면 Job Sync Service /
 * Job Search Service에서 동일하게 사용할 수 있다.
 *
 * 향후 SARAMIN / LOCAL_GOVERNMENT / DIRECT_POSTING 등을 추가할 때는
 * 이 폴더에 provider 파일을 하나 더 만들고 job-provider-factory.ts에 등록하기만 하면 된다.
 */

/**
 * NormalizedJob: External Response -> Adapter를 거쳐 나온 내부 표준 채용공고 모델.
 * jobs 테이블/Job 도메인 타입과 1:1에 가깝게 맞추되, Provider 응답에 없는 필드는 모두 nullable이다.
 */
export interface NormalizedJob {
  externalSource: JobProviderName;
  externalId: string;

  companyName: string;
  businessRegistrationNumber?: string;
  industryName?: string;

  title: string;
  description?: string;

  occupationCode?: string;
  occupationName?: string;
  jobCategory?: string;

  regionSido?: Region;
  regionSigungu?: string;
  address?: string;
  zipCode?: string;

  salaryType?: "daily" | "hourly" | "monthly" | "annual" | (string & {});
  salaryMin?: number;
  salaryMax?: number;
  salaryText?: string;

  employmentType?: "full_time" | "part_time" | "contract" | "daily" | "freelance" | (string & {});
  employmentTypeCode?: string;

  careerRequirement?: "new" | "experienced" | "any" | (string & {});
  educationRequirement?: string;
  qualificationRequirements?: string;

  workHours?: string;
  workDays?: string;

  /** Work24 pfPreferential 코드 원본 (예: ["14", "B"]) */
  preferentialCodes?: string[];
  recommendedAgeGroups?: AgeGroup[];

  applyDeadline?: string;
  postedAt?: string;
  sourceUpdatedAt?: string;

  sourceUrl?: string;
  mobileSourceUrl?: string;

  isActive: boolean;

  /** Provider 원본 응답 스냅샷 (감사/재파싱용) */
  rawPayload: Record<string, unknown>;
  fetchedAt: string;
}

/**
 * 상세 조회(callTp=D)로만 얻을 수 있는 보강 필드.
 * 목록 응답에는 제목·급여·지역 같은 요약만 있어 직무내용과 경력 조건이 비어 있다.
 */
export interface JobDetailPatch {
  externalId: string;
  /** 실제 직무내용(jobCont). 목록의 description 은 제목 복사본이라 이걸로 덮는다. */
  description?: string;
  /** 경력 조건 원문(enterTpNm). "경력 (최소3년) 필수"처럼 필수/우대 표시가 붙어 온다. */
  requirements?: string;
  qualificationRequirements?: string;
  workHours?: string;
  benefits?: string;
  /** 상세 원본 스냅샷. 필드가 늘어도 재파싱할 수 있게 통째로 보관한다. */
  rawDetail: Record<string, unknown>;
}

/** V1에서 우선 지원하는 검색 파라미터 (고용24 스펙 기준, Provider마다 지원 범위가 다를 수 있다). */
export interface JobProviderSearchParams {
  keyword?: string;
  region?: string;
  occupation?: string;
  /** 임금형태: D(일급)/H(시급)/M(월급)/Y(연봉) */
  salaryType?: string;
  minPay?: number;
  maxPay?: number;
  education?: string;
  /** 경력: N(신입)/E(경력)/Z(관계없음) */
  career?: string;
  minCareerMonths?: number;
  maxCareerMonths?: number;
  /** 고용형태 코드: 10/11/20/21 */
  employmentTypeCode?: string;
  holidayType?: string;
  certLicense?: string;
  regDateRange?: string;
  /** 중장년 우대조건 등 Work24 pfPreferential 코드 (예: "14", "B") */
  preferentialCode?: string;
  workHourCode?: string;
  sortOrderBy?: string;

  /** 1부터 시작 (Work24 startPage, 최대 1000) */
  page: number;
  /** 페이지당 건수 (Work24 display, 최대 100) */
  pageSize: number;
}

export interface JobProviderSearchResult {
  jobs: NormalizedJob[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface JobProvider {
  getProviderName(): JobProviderName;
  searchJobs(params: JobProviderSearchParams): Promise<JobProviderSearchResult>;
  getJobDetail(externalId: string): Promise<NormalizedJob | null>;

  /**
   * 상세 전용 응답에서만 얻는 보강 필드를 받아 온다.
   * 상세 엔드포인트가 따로 없는 Provider 는 구현하지 않아도 된다.
   */
  fetchJobDetail?(externalId: string, infoSvc?: string): Promise<JobDetailPatch | null>;
}
