import {
  BaseJobProvider,
  CAREER_CODE_MAP,
  EMPLOYMENT_TYPE_CODE_MAP,
  SALARY_TYPE_CODE_MAP,
  guessRecommendedAgeGroups,
  guessRegionFromText,
  splitRegionSigungu,
} from "./base-provider";
import { parseWork24ListXml } from "./work24-xml-parser";
import type { JobProviderName, JobProviderSearchParams, JobProviderSearchResult, NormalizedJob } from "./types";

const WORK24_LIST_ENDPOINT = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do";

/** 고용24 목록 API의 페이지 제한 (명세서 기준). */
export const WORK24_MAX_START_PAGE = 1000;
export const WORK24_MAX_DISPLAY = 100;

function toStr(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}

function toNum(value: unknown): number | undefined {
  const str = toStr(value);
  if (!str) return undefined;
  const num = Number(str.replace(/,/g, ""));
  return Number.isFinite(num) ? num : undefined;
}

/** 워크넷 직종코드는 6자리 고정 - 숫자로 파싱되며 잘린 앞자리 0을 복원한다. */
function toJobsCode(value: unknown): string | undefined {
  const str = toStr(value);
  if (!str) return undefined;
  return /^\d+$/.test(str) ? str.padStart(6, "0") : str;
}

/**
 * Work24 원문 날짜를 ISO(YYYY-MM-DD[THH:mm:ss])로 정규화한다.
 * 원문 형태가 제각각이라("26-10-18", "채용시까지  26-10-18", "2026-08-20 14:22:33",
 * "20260820142233") 그대로 DB timestamp 컬럼에 넣으면 실패한다.
 * 날짜를 찾지 못하면(예: "채용시까지" 단독 = 상시채용) undefined를 반환한다.
 */
function toIsoDate(value: unknown): string | undefined {
  const str = toStr(value);
  if (!str) return undefined;

  const dashed = str.match(/(\d{2,4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dashed) {
    const year = dashed[1].length === 2 ? `20${dashed[1]}` : dashed[1];
    const date = `${year}-${dashed[2].padStart(2, "0")}-${dashed[3].padStart(2, "0")}`;
    if (dashed[4]) return `${date}T${dashed[4].padStart(2, "0")}:${dashed[5]}:${dashed[6] ?? "00"}`;
    return date;
  }

  const compact = str.match(/\b(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2}))?\b/);
  if (compact) {
    const date = `${compact[1]}-${compact[2]}-${compact[3]}`;
    if (compact[4]) return `${date}T${compact[4]}:${compact[5]}:${compact[6]}`;
    return date;
  }

  return undefined;
}

/** Work24 "career" 응답은 코드가 아니라 자유 텍스트/설명인 경우가 많아 키워드로 유추한다. */
function guessCareerRequirement(careerText?: string): NormalizedJob["careerRequirement"] {
  if (!careerText) return undefined;
  if (careerText.includes("무관")) return "any";
  if (careerText.includes("신입")) return "new";
  if (careerText.includes("경력")) return "experienced";
  return undefined;
}

function guessSalaryTypeFromName(name?: string): NormalizedJob["salaryType"] {
  if (!name) return undefined;
  if (name.includes("연봉")) return "annual";
  if (name.includes("월급") || name.includes("월")) return "monthly";
  if (name.includes("시급") || name.includes("시간")) return "hourly";
  if (name.includes("일급") || name.includes("일당")) return "daily";
  return undefined;
}

/**
 * Work24 API Response Adapter.
 * 외부 응답 구조(고용24 필드명)를 앱 내부 NormalizedJob 모델로 변환한다.
 * 이 함수 밖에서는 어디에서도 Work24 고유 필드명(wantedAuthNo, salTpNm 등)을 참조하지 않는다.
 */
export function adaptWork24Entry(entry: Record<string, unknown>, fetchedAt: string): NormalizedJob | null {
  const externalId = toStr(entry.wantedAuthNo);
  if (!externalId) return null;

  const regionRaw = toStr(entry.region);
  const regionSido = guessRegionFromText(regionRaw);
  const regionSigungu = splitRegionSigungu(regionRaw, regionSido);

  const address = [toStr(entry.strtnmCd), toStr(entry.basicAddr), toStr(entry.detailAddr)]
    .filter(Boolean)
    .join(" ") || undefined;

  const empTpCd = toStr(entry.empTpCd);
  const minEdubg = toStr(entry.minEdubg);
  const maxEdubg = toStr(entry.maxEdubg);
  const educationRequirement =
    minEdubg && maxEdubg && minEdubg !== maxEdubg ? `${minEdubg} ~ ${maxEdubg}` : (minEdubg ?? maxEdubg);

  const careerText = toStr(entry.career);
  const salTpNm = toStr(entry.salTpNm);

  // pfPreferential은 검색 파라미터이지만, 응답 명세에 포함되는 계정도 있어 방어적으로 함께 파싱한다.
  const preferentialRaw = toStr(entry.pfPreferential) ?? toStr(entry.prefCnd);
  const preferentialCodes = preferentialRaw ? preferentialRaw.split(/[,|]/).map((v) => v.trim()).filter(Boolean) : [];

  return {
    externalSource: "work24",
    externalId,
    companyName: toStr(entry.company) ?? "",
    businessRegistrationNumber: toStr(entry.busino),
    industryName: toStr(entry.indTpNm),
    title: toStr(entry.title) ?? "",
    description: toStr(entry.title),
    // XML 파서(parseTagValue)가 "029202"를 숫자 29202로 바꿔 앞자리 0이 사라지므로 6자리로 복원한다.
    occupationCode: toJobsCode(entry.jobsCd),
    occupationName: undefined,
    regionSido,
    regionSigungu,
    address,
    zipCode: toStr(entry.zipCd),
    salaryType: guessSalaryTypeFromName(salTpNm) ?? (toStr(entry.salTp) ? SALARY_TYPE_CODE_MAP[toStr(entry.salTp) as string] : undefined),
    salaryMin: toNum(entry.minSal),
    salaryMax: toNum(entry.maxSal),
    salaryText: toStr(entry.sal) ?? salTpNm,
    employmentType: empTpCd ? EMPLOYMENT_TYPE_CODE_MAP[empTpCd] : undefined,
    employmentTypeCode: empTpCd,
    careerRequirement: (careerText && CAREER_CODE_MAP[careerText]) ?? guessCareerRequirement(careerText),
    educationRequirement,
    qualificationRequirements: undefined,
    workHours: undefined,
    workDays: toStr(entry.holidayTpNm),
    preferentialCodes,
    recommendedAgeGroups: guessRecommendedAgeGroups(preferentialCodes),
    applyDeadline: toIsoDate(entry.closeDt),
    postedAt: toIsoDate(entry.regDt),
    sourceUpdatedAt: toIsoDate(entry.smodifyDtm),
    sourceUrl: toStr(entry.wantedInfoUrl),
    mobileSourceUrl: toStr(entry.wantedMobileInfoUrl),
    isActive: true,
    rawPayload: entry,
    fetchedAt,
  };
}

function buildQueryParams(authKey: string, params: JobProviderSearchParams): URLSearchParams {
  const qs = new URLSearchParams();
  qs.set("authKey", authKey);
  qs.set("callTp", "L");
  qs.set("returnType", "XML");
  qs.set("startPage", String(Math.min(WORK24_MAX_START_PAGE, Math.max(1, params.page))));
  qs.set("display", String(Math.min(WORK24_MAX_DISPLAY, Math.max(1, params.pageSize))));

  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.region) qs.set("region", params.region);
  if (params.occupation) qs.set("occupation", params.occupation);
  if (params.salaryType) qs.set("salTp", params.salaryType);
  if (params.minPay !== undefined) qs.set("minPay", String(params.minPay));
  if (params.maxPay !== undefined) qs.set("maxPay", String(params.maxPay));
  if (params.education) qs.set("education", params.education);
  if (params.career) qs.set("career", params.career);
  if (params.minCareerMonths !== undefined) qs.set("minCareerM", String(params.minCareerMonths));
  if (params.maxCareerMonths !== undefined) qs.set("maxCareerM", String(params.maxCareerMonths));
  if (params.employmentTypeCode) qs.set("empTp", params.employmentTypeCode);
  if (params.holidayType) qs.set("holidayTp", params.holidayType);
  if (params.certLicense) qs.set("certLic", params.certLicense);
  if (params.regDateRange) qs.set("regDate", params.regDateRange);
  if (params.preferentialCode) qs.set("pfPreferential", params.preferentialCode);
  if (params.workHourCode) qs.set("workHrCd", params.workHourCode);
  if (params.sortOrderBy) qs.set("sortOrderBy", params.sortOrderBy);

  return qs;
}

/**
 * 고용24(Work24) 채용정보 Open API Provider.
 *
 * WORK24_API_KEY가 설정된 경우에만 활성화된다 (job-provider-factory에서 분기).
 * 실제 API 사용약관에 따라:
 * - 무리한 짧은 주기 Polling을 하지 않는다 (관리자 수동 Sync만 지원).
 * - 원본 응답(raw_payload)을 그대로 보존해 향후 필드 추가 시 재파싱 가능하게 한다.
 */
export class Work24JobProvider extends BaseJobProvider {
  constructor(private readonly authKey: string) {
    super();
  }

  getProviderName(): JobProviderName {
    return "work24";
  }

  async searchJobs(params: JobProviderSearchParams): Promise<JobProviderSearchResult> {
    const qs = buildQueryParams(this.authKey, params);
    const response = await fetch(`${WORK24_LIST_ENDPOINT}?${qs.toString()}`, {
      method: "GET",
      // 고용24 API는 수 초가 걸릴 수 있어 넉넉한 타임아웃을 서버 fetch 기본값에 맡긴다.
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Work24 API 호출 실패: HTTP ${response.status}`);
    }
    const xml = await response.text();
    const fetchedAt = new Date().toISOString();
    const { totalCount, entries } = parseWork24ListXml(xml);

    const jobs = entries
      .map((entry) => adaptWork24Entry(entry, fetchedAt))
      .filter((job): job is NormalizedJob => job !== null);

    const consumed = (params.page - 1) * params.pageSize + jobs.length;
    return {
      jobs,
      totalCount,
      page: params.page,
      pageSize: params.pageSize,
      hasMore: consumed < totalCount && jobs.length >= params.pageSize,
    };
  }

  async getJobDetail(externalId: string): Promise<NormalizedJob | null> {
    // 고용24 목록 API는 keyword로 개별 공고를 좁혀 조회하는 방식이 가장 안전하다.
    // (상세 조회 전용 엔드포인트는 계약/명세서에 따라 별도 인증이 필요할 수 있어 V1에서는 목록 재조회로 대체한다.)
    const result = await this.searchJobs({ keyword: externalId, page: 1, pageSize: 10 });
    return result.jobs.find((job) => job.externalId === externalId) ?? result.jobs[0] ?? null;
  }
}
