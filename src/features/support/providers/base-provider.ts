import type {
  NormalizedSupportProgram,
  SupportProvider,
  SupportProviderName,
  SupportProviderSearchParams,
  SupportProviderSearchResult,
} from "./types";

/**
 * Provider 공통 로직(페이지네이션 반복 호출 등)을 제공하는 추상 베이스.
 * features/jobs/providers/base-provider.ts의 BaseJobProvider와 동일한 철학이다.
 */
export abstract class BaseSupportProvider implements SupportProvider {
  abstract getProviderName(): SupportProviderName;
  abstract searchPrograms(params: SupportProviderSearchParams): Promise<SupportProviderSearchResult>;
  abstract getProgramDetail(externalId: string): Promise<NormalizedSupportProgram | null>;

  async *iteratePages(
    baseParams: Omit<SupportProviderSearchParams, "page" | "pageSize">,
    options: { batchSize: number; maxPages: number },
  ): AsyncGenerator<NormalizedSupportProgram[]> {
    const pageSize = Math.min(100, Math.max(1, options.batchSize));
    for (let page = 1; page <= options.maxPages; page++) {
      const result = await this.searchPrograms({ ...baseParams, page, pageSize });
      if (result.programs.length > 0) yield result.programs;
      if (!result.hasMore || result.programs.length === 0) break;
    }
  }
}
