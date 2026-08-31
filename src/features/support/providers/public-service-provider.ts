import { guessRegionFromText } from "@/features/jobs/providers/base-provider";
import { BaseSupportProvider } from "./base-provider";
import type {
  NormalizedSupportProgram,
  SupportProviderName,
  SupportProviderSearchParams,
  SupportProviderSearchResult,
} from "./types";

/**
 * PublicServiceSupportProvider: "행정안전부 대한민국 공공서비스(혜택) 정보 OPEN API" 연동 Provider.
 *
 * STEP 5.5에서 실제 API를 직접 호출해 아래 3개 오퍼레이션의 실제 응답 구조를 확인하고,
 * 그 결과만을 기준으로 아래 어댑터를 작성했다(추측 필드 없음. 완료보고에 실제 응답 샘플 첨부).
 *
 *   1) GET https://api.odcloud.kr/api/gov24/v3/serviceList?page=&perPage=
 *      -> { currentCount, matchCount, totalCount, page, perPage, data: [...] }
 *      data[] 실제 필드(확인됨): 서비스ID, 서비스명, 서비스목적요약, 서비스분야, 소관기관명, 부서명,
 *        소관기관유형, 소관기관코드, 지원대상, 선정기준, 지원내용, 지원유형, 신청기한, 신청방법,
 *        전화문의, 접수기관, 상세조회URL, 등록일시, 수정일시, 조회수.
 *
 *   2) GET https://api.odcloud.kr/api/gov24/v3/serviceDetail?cond[서비스ID::EQ]=<서비스ID>
 *      -> { data: [...] } (연결키: 서비스ID, serviceList와 동일)
 *      실제 필드(확인됨): 서비스ID, 서비스명, 서비스목적, 소관기관명, 선정기준, 지원대상, 지원내용,
 *        지원유형, 신청기한, 신청방법, 구비서류, 공무원확인구비서류, 본인확인필요구비서류, 문의처,
 *        온라인신청사이트URL, 접수기관명, 법령, 자치법규, 행정규칙, 수정일시.
 *      -> serviceList에 없는 "온라인신청사이트URL"(실제 신청 URL), "구비서류"를 여기서만 얻을 수 있다.
 *
 *   3) GET https://api.odcloud.kr/api/gov24/v3/supportConditions?cond[서비스ID::EQ]=<서비스ID>
 *      -> { data: [...] } (연결키: 서비스ID, 동일)
 *      실제 필드: 서비스ID, 서비스명 + JA0101~JA2299 형태의 코드 컬럼 다수(값은 "Y" 또는 null 또는 숫자).
 *      공식 코드표를 공공데이터포털에서 확보하지 못해 각 코드의 의미를 임의로 단정하지 않았다.
 *      단, 12개 이상의 실제 서비스(연령대가 서로 다른 청년/구직/중장년/경력단절 프로그램)를 교차 비교한 결과
 *        JA0110 = 신청 가능 최소연령, JA0111 = 신청 가능 최대연령 이라는 점만은 숫자가 지원대상 텍스트의
 *        "만 OO~OO세"와 정확히 일치해 신뢰도 높게 확인했다 (완료보고 표 참고). 그 외 코드는 구조화하지 않고
 *        rawPayload에만 원문 그대로 보존한다 (CHECK_REQUIRED 원칙 준수).
 *
 * PUBLIC_SERVICE_API_KEY가 비어있으면 이 Provider는 생성되지 않고 MockSupportProvider가 대신 사용된다.
 */

const DEFAULT_BASE_URL = "https://api.odcloud.kr/api/gov24/v3";

/** gov24 사용자구분("개인", "법인/시설/단체", "개인||소상공인" 등) → 수혜 주체 분류 */
function parseAudience(userType?: string): "personal" | "business" | "both" {
  if (!userType) return "personal";
  const personal = /개인|가구/.test(userType);
  const business = /소상공인|법인/.test(userType);
  if (personal && business) return "both";
  if (business) return "business";
  return "personal";
}

interface ServiceListRow {
  서비스ID: string;
  서비스명: string;
  서비스목적요약?: string;
  서비스분야?: string;
  소관기관명?: string;
  부서명?: string;
  소관기관유형?: string;
  지원대상?: string;
  선정기준?: string;
  지원내용?: string;
  지원유형?: string;
  신청기한?: string;
  신청방법?: string;
  전화문의?: string;
  접수기관?: string;
  상세조회URL?: string;
  등록일시?: string;
  수정일시?: string;
  조회수?: number;
  [key: string]: unknown;
}

interface ServiceDetailRow {
  서비스ID: string;
  서비스명?: string;
  서비스목적?: string;
  선정기준?: string;
  지원대상?: string;
  지원내용?: string;
  지원유형?: string;
  신청기한?: string;
  신청방법?: string;
  구비서류?: string;
  문의처?: string;
  온라인신청사이트URL?: string;
  접수기관명?: string;
  수정일시?: string;
  [key: string]: unknown;
}

interface SupportConditionsRow {
  서비스ID: string;
  서비스명?: string;
  /** 신청 가능 최소연령 (실측 기준 신뢰도 높음. 그 외 JA코드는 공식 코드표 미확보로 구조화하지 않음). */
  JA0110?: number | string | null;
  /** 신청 가능 최대연령 */
  JA0111?: number | string | null;
  [key: string]: unknown;
}

interface ODCloudListResponse<T> {
  currentCount?: number;
  matchCount?: number;
  totalCount?: number;
  page?: number;
  perPage?: number;
  data?: T[];
}

function toTrimmedString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** 구비서류 등 줄바꿈/불릿 기반 텍스트를 항목 배열로 분리한다. */
function splitDocuments(raw?: string): string[] | undefined {
  if (!raw) return undefined;
  const items = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-\s○*]+/, "").trim())
    .filter(Boolean)
    .filter((line) => line !== "해당없음");
  return items.length > 0 ? items : undefined;
}

/**
 * 지원대상/선정기준 원문에서 소득/가구/학력 관련 조건 "존재 여부"만 탐지해 짧은 원문 발췌를 남긴다.
 * (섹션 8 요구사항: 자연어로만 판정 가능한 조건은 억지로 구조화하지 않고 CHECK_REQUIRED로 안내)
 * 값이 채워지면 evaluateSupportEligibilitySync()가 자동으로 "확인 필요" 조건에 추가한다.
 * 취업상태(employmentStatusTargets)는 잘못 추정 시 정상 대상자를 "미충족"으로 오판정할 위험이 있어
 * 여기서는 다루지 않는다(자연어 원문은 eligibilityRaw에 이미 보존됨).
 */
const CONDITION_KEYWORDS: Array<{ field: "incomeCondition" | "householdCondition" | "educationCondition"; pattern: RegExp }> = [
  { field: "incomeCondition", pattern: /(중위소득|가구소득|소득\s*[0-9]|재산\s*[0-90-9억만]|기준소득|차상위|저소득)/ },
  { field: "householdCondition", pattern: /(가구단위|세대주|부양가족|가구원|한부모|다자녀|맞벌이|홑벌이)/ },
  { field: "educationCondition", pattern: /(고졸|대졸|재학|졸업|학력\s*(제한|기준)|중졸|고등학교|대학교)/ },
];

function extractConditionSignal(eligibilityRaw: string | undefined, pattern: RegExp): string | undefined {
  if (!eligibilityRaw) return undefined;
  const match = eligibilityRaw.match(pattern);
  if (!match || match.index === undefined) return undefined;
  const start = Math.max(0, match.index - 20);
  const end = Math.min(eligibilityRaw.length, match.index + match[0].length + 40);
  const snippet = eligibilityRaw.slice(start, end).replace(/\s+/g, " ").trim();
  return `확인 필요 - 원문: "${snippet}${end < eligibilityRaw.length ? "…" : ""}"`;
}

function extractConditionSignals(eligibilityRaw?: string) {
  const result: Partial<Pick<NormalizedSupportProgram, "incomeCondition" | "householdCondition" | "educationCondition">> = {};
  for (const { field, pattern } of CONDITION_KEYWORDS) {
    const signal = extractConditionSignal(eligibilityRaw, pattern);
    if (signal) result[field] = signal;
  }
  return result;
}

/** "현금(감면)" 같은 자유 텍스트 지원유형을 내부 enum으로 매핑한다(단정하지 않고 우선순위 키워드만 사용). */
function mapSupportType(raw?: string): "cash" | "training_voucher" | "insurance" | "tax_benefit" | "other" {
  if (!raw) return "other";
  if (/바우처|이용권/.test(raw)) return "training_voucher";
  if (/보험/.test(raw)) return "insurance";
  if (/현금/.test(raw)) return "cash";
  if (/세제|감면|세금|면제/.test(raw)) return "tax_benefit";
  return "other";
}

/**
 * regionScope 추정.
 *
 * "소관기관유형" 은 중앙행정기관 / 광역시도 / 시군구 / 교육청 / 공공기관 다섯 가지로 들어온다.
 *   - 중앙행정기관: 전국으로 확정한다.
 *   - 광역시도·시군구·교육청: 지역 기관이므로 기관명에서 지역을 찾는다. 못 찾으면 비워 둔다
 *     (틀린 지역을 넣느니 모르는 채로 두는 편이 낫다).
 *   - 공공기관: 한국장학재단처럼 전국인 곳과 용산구시설관리공단처럼 한 지역인 곳이 섞여 있다.
 *     기관명에서 지역이 나오면 그 지역, 안 나오면 전국으로 본다.
 */
function guessRegionScope(row: ServiceListRow): "national" | ReturnType<typeof guessRegionFromText> {
  if (row.소관기관유형 === "중앙행정기관") return "national";

  const haystack = [row.접수기관, row.소관기관명, row.지원대상].filter(Boolean).join(" ");
  const region = guessRegionFromText(haystack);
  if (region) return region;

  return row.소관기관유형 === "공공기관" ? "national" : undefined;
}

function adaptListRow(row: ServiceListRow): NormalizedSupportProgram {
  const eligibilityParts = [row.지원대상, row.선정기준].filter(Boolean);
  const eligibilityRaw = eligibilityParts.length > 0 ? eligibilityParts.join("\n\n") : undefined;
  const conditionSignals = extractConditionSignals(eligibilityRaw);

  return {
    externalSource: "public_service",
    externalId: row.서비스ID,
    title: row.서비스명,
    organizationName: row.소관기관명 ?? "확인 필요",
    organizationType: toTrimmedString(row.소관기관유형),
    departmentName: toTrimmedString(row.부서명),
    summary: toTrimmedString(row.서비스목적요약),
    description: toTrimmedString(row.지원내용) ?? toTrimmedString(row.서비스목적요약),
    category: "other", // Support Sync Service가 career-relevance 결과로 재계산한다.
    supportType: mapSupportType(row.지원유형),
    targetDescription: toTrimmedString(row.지원대상),
    eligibilityRaw,
    ...conditionSignals,
    regionScope: guessRegionScope(row),
    audience: parseAudience(toTrimmedString(row.사용자구분)),
    benefitDescription: toTrimmedString(row.지원내용),
    applicationPeriod: toTrimmedString(row.신청기한),
    applicationMethod: toTrimmedString(row.신청방법),
    contact: toTrimmedString(row.전화문의),
    sourceUrl: toTrimmedString(row.상세조회URL),
    isActive: true,
    rawPayload: row as Record<string, unknown>,
    fetchedAt: new Date().toISOString(),
  };
}

/** serviceDetail 응답으로 List 기반 NormalizedSupportProgram을 보강한다(실제 신청URL/구비서류 등 List에 없는 값). */
function mergeDetailRow(base: NormalizedSupportProgram, detail: ServiceDetailRow): NormalizedSupportProgram {
  const requiredDocuments = splitDocuments(detail.구비서류);
  const onlineApplyUrl = toTrimmedString(detail.온라인신청사이트URL);
  const applicationMethodParts = [base.applicationMethod, detail.접수기관명 ? `접수기관: ${detail.접수기관명}` : undefined].filter(
    Boolean,
  );

  return {
    ...base,
    // 온라인신청사이트URL이 있으면 "공식 신청페이지 보기" 버튼이 실제 신청 화면으로 바로 연결되도록 우선 사용.
    // 없으면 기존 상세조회URL(정부24 안내 페이지)을 그대로 유지한다. 임의 URL은 생성하지 않는다.
    sourceUrl: onlineApplyUrl ?? base.sourceUrl,
    requiredDocuments: requiredDocuments ?? base.requiredDocuments,
    applicationMethod: applicationMethodParts.length > 0 ? applicationMethodParts.join(" / ") : base.applicationMethod,
    contact: toTrimmedString(detail.문의처) ?? base.contact,
    rawPayload: { ...base.rawPayload, __serviceDetail: detail as unknown as Record<string, unknown> },
  };
}

export interface SupportConditionsResult {
  ageMin?: number;
  ageMax?: number;
  raw: SupportConditionsRow;
}

async function fetchWithRetry(url: string, apiKey: string, retries = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Infuser ${apiKey}`, Accept: "application/json" },
        cache: "no-store",
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("[PublicServiceSupportProvider] 재시도 후에도 요청 실패");
}

export class PublicServiceSupportProvider extends BaseSupportProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = process.env.PUBLIC_SERVICE_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  }

  getProviderName(): SupportProviderName {
    return "public_service";
  }

  async searchPrograms(params: SupportProviderSearchParams): Promise<SupportProviderSearchResult> {
    const url = new URL(`${this.baseUrl}/serviceList`);
    url.searchParams.set("page", String(params.page));
    url.searchParams.set("perPage", String(params.pageSize));
    if (params.keyword) url.searchParams.set("cond[서비스명::LIKE]", params.keyword);

    const res = await fetchWithRetry(url.toString(), this.apiKey);
    if (!res.ok) {
      throw new Error(`[PublicServiceSupportProvider] serviceList 호출 실패: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as ODCloudListResponse<ServiceListRow>;
    const rows = json.data ?? [];
    const totalCount = json.matchCount ?? json.totalCount ?? rows.length;

    return {
      programs: rows.map(adaptListRow),
      totalCount,
      page: params.page,
      pageSize: params.pageSize,
      hasMore: params.page * params.pageSize < totalCount,
    };
  }

  async getProgramDetail(externalId: string): Promise<NormalizedSupportProgram | null> {
    // serviceDetail 단독 호출은 serviceList의 다른 필드(지원대상 등)를 포함하지 않으므로,
    // 먼저 List를 1건 조회해 기본형을 만들고 Detail로 보강한다(연결키: 서비스ID).
    const listUrl = new URL(`${this.baseUrl}/serviceList`);
    listUrl.searchParams.set("page", "1");
    listUrl.searchParams.set("perPage", "1");
    listUrl.searchParams.set("cond[서비스ID::EQ]", externalId);
    const listRes = await fetchWithRetry(listUrl.toString(), this.apiKey);
    if (!listRes.ok) return null;
    const listJson = (await listRes.json()) as ODCloudListResponse<ServiceListRow>;
    const listRow = listJson.data?.[0];
    if (!listRow) return null;
    let normalized = adaptListRow(listRow);

    const detailUrl = new URL(`${this.baseUrl}/serviceDetail`);
    detailUrl.searchParams.set("cond[서비스ID::EQ]", externalId);
    const detailRes = await fetchWithRetry(detailUrl.toString(), this.apiKey);
    if (detailRes.ok) {
      const detailJson = (await detailRes.json()) as ODCloudListResponse<ServiceDetailRow>;
      const detailRow = detailJson.data?.[0];
      if (detailRow) normalized = mergeDetailRow(normalized, detailRow);
    }

    return normalized;
  }

  /**
   * supportConditions 호출 -> 신청 가능 연령(JA0110/JA0111)만 구조화해 반환한다.
   * 그 외 JA코드는 공식 코드표를 확보하지 못해 의미를 단정하지 않고 raw에만 담아 보존한다.
   */
  async getProgramConditions(externalId: string): Promise<SupportConditionsResult | null> {
    const url = new URL(`${this.baseUrl}/supportConditions`);
    url.searchParams.set("cond[서비스ID::EQ]", externalId);
    const res = await fetchWithRetry(url.toString(), this.apiKey);
    if (!res.ok) return null;
    const json = (await res.json()) as ODCloudListResponse<SupportConditionsRow>;
    const row = json.data?.[0];
    if (!row) return null;
    return {
      ageMin: toNumber(row.JA0110),
      ageMax: toNumber(row.JA0111),
      raw: row,
    };
  }
}
