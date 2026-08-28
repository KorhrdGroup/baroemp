import {
  BaseJobProvider,
  CAREER_CODE_MAP,
  EMPLOYMENT_TYPE_CODE_MAP,
  SALARY_TYPE_CODE_MAP,
  guessRecommendedAgeGroups,
  guessRegionFromText,
  splitRegionSigungu,
} from "./base-provider";
import { parseWork24DetailXml, parseWork24ListXml } from "./work24-xml-parser";
import type {
  JobDetailPatch,
  JobProviderName,
  JobProviderSearchParams,
  JobProviderSearchResult,
  NormalizedJob,
} from "./types";

const WORK24_LIST_ENDPOINT = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do";
const WORK24_DETAIL_ENDPOINT = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D01.do";

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
    companyName: cleanLineText(entry.company) ?? "",
    businessRegistrationNumber: toStr(entry.busino),
    industryName: cleanLineText(entry.indTpNm),
    title: cleanLineText(entry.title) ?? "",
    description: cleanLineText(entry.title),
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
    workDays: cleanLineText(entry.holidayTpNm),
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


/**
 * 고용24 텍스트의 이스케이프를 푼다.
 *
 * 원본 XML 에 &amp;#xd; 로 들어 있어 파서가 &amp; 만 풀면 "&#xd;" 가 글자로 남는다.
 * 한 번만 풀면 이 남은 것을 못 잡는다 - 숫자 엔티티를 먼저 풀어도 처음 글자는
 * "&amp;#xd;" 라 숫자 규칙에 걸리지 않고, 이름 규칙이 &amp; 를 풀어 "&#xd;" 를 만들어
 * 놓은 채 끝난다. 실제로 근무시간 13,570건에 이 문자열이 그대로 남아 있었다.
 * 그래서 더 풀리지 않을 때까지 돌린다. 몇 겹으로 싸여 있어도 끝까지 벗겨진다.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** 한 번 벗기기. 겹쳐 있으면 남을 수 있어 아래 decodeEntities 가 반복해 부른다. */
function decodeEntitiesOnce(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name: string) => NAMED_ENTITIES[name] ?? _);
}

function decodeEntities(text: string): string {
  let current = text;
  // 겹은 많아야 두세 겹이다. 이상한 입력에 무한히 돌지 않도록 횟수를 막아 둔다.
  for (let i = 0; i < 5; i += 1) {
    const next = decodeEntitiesOnce(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

/** 상세 본문용: 엔티티를 풀고 줄바꿈을 정리한다. */
function cleanDetailText(value: unknown): string | undefined {
  const text = toStr(value);
  if (!text) return undefined;
  const cleaned = decodeEntities(text)
    .replace(/\r\n?/g, "\n")     // CR / CRLF -> LF
    .replace(/[ \t]+$/gm, "")     // 줄 끝 공백
    .replace(/\n{3,}/g, "\n\n")  // 빈 줄이 셋 이상이면 둘로
    .trim();
  return cleaned || undefined;
}

/**
 * 한 줄짜리 값용: 엔티티를 풀고 줄바꿈·연속 공백을 공백 하나로 만든다.
 * 제목·주소처럼 한 줄로 읽히는 칸에 CR 이 그대로 들어가면 목록에서 줄이 깨진다.
 */
function cleanLineText(value: unknown): string | undefined {
  const text = toStr(value);
  if (!text) return undefined;
  const cleaned = decodeEntities(text).replace(/\s+/g, " ").trim();
  return cleaned || undefined;
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

  /**
   * 공고 한 건의 상세를 받아 온다.
   *
   * 목록과 같은 인증키로 callTp=D 만 바꾸면 된다(별도 인증 불필요 - 실측 확인).
   * infoSvc 는 목록 응답의 infoSvc 를 그대로 넘겨야 하며, 값이 없으면 대부분인
   * VALIDATION 으로 시도한다.
   */
  async fetchJobDetail(externalId: string, infoSvc?: string): Promise<JobDetailPatch | null> {
    const qs = new URLSearchParams({
      authKey: this.authKey,
      callTp: "D",
      returnType: "XML",
      wantedAuthNo: externalId,
      infoSvc: infoSvc?.trim() || "VALIDATION",
    });

    const response = await fetch(`${WORK24_DETAIL_ENDPOINT}?${qs.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Work24 상세 호출 실패: HTTP ${response.status}`);

    const detail = parseWork24DetailXml(await response.text());
    if (!detail) return null;

    // 4대보험·퇴직금은 별도 칸으로 오는데 화면에서는 한 줄로 읽히는 게 자연스럽다.
    const benefits = [cleanDetailText(detail.fourIns), cleanDetailText(detail.retirepay)]
      .filter(Boolean)
      .join(", ");

    return {
      externalId,
      title: cleanLineText(detail.wantedTitle),
      description: cleanDetailText(detail.jobCont),
      requirements: cleanDetailText(detail.enterTpNm),
      qualificationRequirements: cleanDetailText(detail.certNm) ?? cleanDetailText(detail.licenseNm),
      workHours: cleanDetailText(detail.workdayWorkhrCont),
      benefits: benefits || undefined,
      rawDetail: detail,
    };
  }

  async getJobDetail(externalId: string): Promise<NormalizedJob | null> {
    // 고용24 목록 API는 keyword로 개별 공고를 좁혀 조회하는 방식이 가장 안전하다.
    // (상세 조회 전용 엔드포인트는 계약/명세서에 따라 별도 인증이 필요할 수 있어 V1에서는 목록 재조회로 대체한다.)
    const result = await this.searchJobs({ keyword: externalId, page: 1, pageSize: 10 });
    return result.jobs.find((job) => job.externalId === externalId) ?? result.jobs[0] ?? null;
  }
}
