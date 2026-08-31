import type { AgeGroup, Region } from "@/types";
/* 지역 추정은 lib/labels 로 옮겼다. 공고·지원제도 화면에서도 같은 판단을 써야 해서다. */
export { guessRegionFromText } from "@/lib/labels";
import type { JobProvider, JobProviderName, JobProviderSearchParams, JobProviderSearchResult, NormalizedJob } from "./types";

/** Work24 고용형태 코드 -> 내부 WorkType 매핑. */
export const EMPLOYMENT_TYPE_CODE_MAP: Record<string, NormalizedJob["employmentType"]> = {
  "10": "full_time", // 기간의 정함이 없는 근로계약
  "11": "part_time", // 기간의 정함이 없는 근로계약(시간선택제)
  "20": "contract", // 기간의 정함이 있는 근로계약
  "21": "part_time", // 기간의 정함이 있는 근로계약(시간선택제)
};

/** Work24 경력 코드 -> 내부 CareerRequirement 매핑. */
export const CAREER_CODE_MAP: Record<string, NormalizedJob["careerRequirement"]> = {
  N: "new",
  E: "experienced",
  Z: "any",
};

/** Work24 임금형태 코드 -> 내부 SalaryType 매핑. */
export const SALARY_TYPE_CODE_MAP: Record<string, NormalizedJob["salaryType"]> = {
  D: "daily",
  H: "hourly",
  M: "monthly",
  Y: "annual",
};

/** 중장년 특화 우대조건 코드. 사용자 추천/필터에 노출할 때 라벨로 사용한다. */
export const PREFERENTIAL_CODE_LABELS: Record<string, string> = {
  "14": "운전가능자 우대",
  B: "(준)고령자(50세 이상) 우대",
};

export function splitRegionSigungu(text?: string, sido?: Region): string | undefined {
  if (!text) return undefined;
  const parts = text.trim().split(/\s+/);
  if (parts.length <= 1) return undefined;
  return sido ? parts.slice(1).join(" ") : parts.slice(1, 2).join(" ");
}

/** (준)고령자 우대(B) / 신입가능 키워드 등을 함께 고려해 중장년 추천 연령대를 추정한다. */
export function guessRecommendedAgeGroups(preferentialCodes: string[] = []): AgeGroup[] | undefined {
  if (preferentialCodes.includes("B")) return ["50s", "60s"];
  return undefined;
}

/**
 * Provider 공통 로직(페이지네이션 반복 호출 등)을 제공하는 추상 베이스.
 * 각 Provider는 searchJobs/getJobDetail만 구현하면 되고,
 * "전체 페이지를 안전하게 순회"하는 로직은 여기서 재사용한다.
 */
export abstract class BaseJobProvider implements JobProvider {
  abstract getProviderName(): JobProviderName;
  abstract searchJobs(params: JobProviderSearchParams): Promise<JobProviderSearchResult>;
  abstract getJobDetail(externalId: string): Promise<NormalizedJob | null>;

  /**
   * 전체 전국 공고를 한 번에 크롤링하지 않고, batchSize 단위로 나눠 최대 maxPages까지만 순회한다.
   * (API 제한/부하를 고려한 pagination + batch sync 구조)
   */
  async *iteratePages(
    baseParams: Omit<JobProviderSearchParams, "page" | "pageSize">,
    options: { batchSize: number; maxPages: number },
  ): AsyncGenerator<NormalizedJob[]> {
    const pageSize = Math.min(100, Math.max(1, options.batchSize));
    for (let page = 1; page <= options.maxPages; page++) {
      const result = await this.searchJobs({ ...baseParams, page, pageSize });
      if (result.jobs.length > 0) yield result.jobs;
      if (!result.hasMore || result.jobs.length === 0) break;
    }
  }
}
