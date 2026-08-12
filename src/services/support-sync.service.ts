import { getSupportProvider, isUsingMockSupportProvider, PublicServiceSupportProvider } from "@/features/support/providers";
import type { NormalizedSupportProgram } from "@/features/support/providers";
import { normalizedSupportToSupportInput } from "@/features/support/providers/to-support-input";
import { getSupportProgramRepository, getSupportProgramRuleRepository, getSupportSyncRunRepository } from "@/lib/repositories";
import { CAREER_RELEVANCE_THRESHOLD, computeCareerRelevance, deriveSupportCategory } from "@/lib/support/career-relevance";
import type { SupportSyncRunStatus, SupportSyncSummary } from "@/types";

export interface SyncSupportProgramsOptions {
  /** 1회 Sync에서 순회할 최대 페이지 수 (대량 수집을 한 번에 무리하게 하지 않기 위한 안전장치). */
  maxPages?: number;
  pageSize?: number;
  triggeredBy?: string;
}

/**
 * List row(rawPayload)의 "수정일시"를 비교해 신규/변경 여부를 판단한다.
 * 실 API가 이 필드를 제공하지 않는 경우(Mock 등)에는 항상 "변경 없음"으로 간주해 불필요한 보강 호출을 막는다.
 */
function hasChangedSinceLastSync(existingRawPayload: Record<string, unknown> | undefined, nextRawPayload: Record<string, unknown>): boolean {
  const prevModified = existingRawPayload?.["수정일시"];
  const nextModified = nextRawPayload["수정일시"];
  if (prevModified === undefined && nextModified === undefined) return false;
  return prevModified !== nextModified;
}

/** 이전 Sync에서 저장해둔 serviceDetail/supportConditions 원본 스냅샷 마커만 골라 이어붙인다. */
function pickEnrichmentMarkers(rawPayload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!rawPayload) return {};
  const picked: Record<string, unknown> = {};
  if (rawPayload.__serviceDetail !== undefined) picked.__serviceDetail = rawPayload.__serviceDetail;
  if (rawPayload.__supportConditions !== undefined) picked.__supportConditions = rawPayload.__supportConditions;
  return picked;
}

/**
 * Support Sync Service: 외부 Provider -> Normalize -> career-relevance 계산 -> support_programs DB Upsert.
 *
 * STEP 5.5에서 추가된 부분:
 * 1. 모든 Provider(mock 포함) 공통으로 career_relevance_score/reasons를 계산해 채운다.
 *    ("바로취업에 적합한 지원제도" 여부는 검색/진단에서만 필터링하고, 원본은 삭제하지 않는다.)
 * 2. PublicServiceSupportProvider의 경우, "관련도 임계값 이상 + 신규/변경"인 데이터에만
 *    serviceDetail/supportConditions 보강 호출을 수행한다(API 일일 호출 한도가 있어 전체 1만여 건에
 *    매번 Detail/Conditions를 호출하면 한도를 초과할 수 있기 때문 — 완료보고 5번 참고).
 * 3. supportConditions에서 확인된 신청 가능 연령(JA0110/JA0111)만 targetAgeMin/targetAgeMax에 반영한다.
 *    (기존 Eligibility Rule Engine의 base-field 판정 경로를 그대로 재사용하기 위해 별도 Rule을 만들지 않음.)
 */
export async function syncSupportProgramsFromProvider(options: SyncSupportProgramsOptions = {}): Promise<SupportSyncSummary> {
  const provider = getSupportProvider();
  const providerName = provider.getProviderName();
  const isMock = isUsingMockSupportProvider();
  const startedAt = new Date().toISOString();

  const syncRunRepo = getSupportSyncRunRepository();
  const run = await syncRunRepo.create({
    provider: providerName,
    startedAt,
    status: "running",
    triggeredBy: options.triggeredBy,
  });

  const programRepo = getSupportProgramRepository();
  const ruleRepo = getSupportProgramRuleRepository();
  const maxPages = options.maxPages ?? Number(process.env.SUPPORT_SYNC_MAX_PAGES ?? 10);
  // Public API는 perPage=100까지 허용됨을 실측 확인(완료보고 참고) - 호출 수를 줄이기 위해 기본값을 크게 잡는다.
  const defaultPageSize = isMock ? 20 : 100;
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? defaultPageSize));
  const canEnrich = provider instanceof PublicServiceSupportProvider;

  let fetchedCount = 0;
  let newCount = 0;
  let updatedCount = 0;
  const duplicateCount = 0;
  let errorCount = 0;
  let relevantCount = 0;
  let enrichedCount = 0;
  const fetchStartedAt = new Date().toISOString();

  try {
    for (let page = 1; page <= maxPages; page++) {
      const result = await provider.searchPrograms({ page, pageSize });
      if (result.programs.length === 0) break;
      fetchedCount += result.programs.length;

      for (const listNormalized of result.programs) {
        try {
          const relevance = computeCareerRelevance({
            title: listNormalized.title,
            summary: listNormalized.summary,
            targetDescription: listNormalized.targetDescription,
            description: listNormalized.description,
            eligibilityRaw: listNormalized.eligibilityRaw,
            benefitDescription: listNormalized.benefitDescription,
          });

          let normalized: NormalizedSupportProgram = {
            ...listNormalized,
            category: deriveSupportCategory(listNormalized, listNormalized.regionScope as string | undefined),
            careerRelevanceScore: relevance.score,
            careerRelevanceReasons: relevance.reasons,
          };

          if (relevance.score >= CAREER_RELEVANCE_THRESHOLD) relevantCount++;

          if (canEnrich && relevance.score >= CAREER_RELEVANCE_THRESHOLD) {
            const existing = await programRepo.findByExternalId(providerName, normalized.externalId);
            const isNewRecord = !existing;
            const changed = existing ? hasChangedSinceLastSync(existing.rawPayload, normalized.rawPayload) : true;

            if (isNewRecord || changed) {
              const publicProvider = provider as PublicServiceSupportProvider;
              const [detail, conditions] = await Promise.all([
                publicProvider.getProgramDetail(normalized.externalId),
                publicProvider.getProgramConditions(normalized.externalId),
              ]);
              if (detail) {
                normalized = {
                  ...normalized,
                  sourceUrl: detail.sourceUrl ?? normalized.sourceUrl,
                  requiredDocuments: detail.requiredDocuments ?? normalized.requiredDocuments,
                  applicationMethod: detail.applicationMethod ?? normalized.applicationMethod,
                  contact: detail.contact ?? normalized.contact,
                  rawPayload: detail.rawPayload,
                };
              }
              if (conditions) {
                normalized = {
                  ...normalized,
                  targetAgeMin: conditions.ageMin ?? normalized.targetAgeMin,
                  targetAgeMax: conditions.ageMax ?? normalized.targetAgeMax,
                  rawPayload: { ...normalized.rawPayload, __supportConditions: conditions.raw as unknown as Record<string, unknown> },
                };
              }
              enrichedCount++;
            } else if (existing) {
              // 변경이 없어 Detail/Conditions를 다시 호출하지 않는 경우, 이전에 보강해둔 값(실제 신청URL,
              // 구비서류, 연령조건 등)을 List 전용 값으로 덮어써서 잃어버리지 않도록 그대로 이어붙인다.
              normalized = {
                ...normalized,
                sourceUrl: existing.sourceUrl ?? normalized.sourceUrl,
                requiredDocuments: existing.requiredDocuments ?? normalized.requiredDocuments,
                applicationMethod: existing.applicationMethod ?? normalized.applicationMethod,
                contact: existing.contact ?? normalized.contact,
                targetAgeMin: existing.targetAgeMin ?? normalized.targetAgeMin,
                targetAgeMax: existing.targetAgeMax ?? normalized.targetAgeMax,
                rawPayload: { ...normalized.rawPayload, ...pickEnrichmentMarkers(existing.rawPayload) },
              };
            }
          }

          const programInput = normalizedSupportToSupportInput(normalized);
          const { program, isNew } = await programRepo.upsertExternal(programInput);
          if (isNew) newCount++;
          else updatedCount++;

          if (normalized.rules && normalized.rules.length > 0) {
            await ruleRepo.replaceForProgram(
              program.id,
              normalized.rules.map((rule) => ({
                supportProgramId: program.id,
                field: rule.field,
                operator: rule.operator,
                value: rule.value,
                weight: rule.weight,
                isRequired: rule.isRequired,
                ruleType: rule.ruleType ?? "structured",
              })),
            );
          }
        } catch (err) {
          // 개별 지원제도 매핑/저장 실패는 전체 Sync를 중단시키지 않고 계속 진행한다.
          if (process.env.NODE_ENV !== "production") {
            console.error("[SupportSyncService] upsertExternal 실패:", err instanceof Error ? err.message : err);
          }
          errorCount++;
        }
      }

      if (!result.hasMore) break;
    }

    const deactivatedCount = await programRepo.deactivateStale(providerName, fetchStartedAt);
    const completedAt = new Date().toISOString();
    const status: SupportSyncRunStatus = errorCount > 0 ? "partial" : "success";

    await syncRunRepo.update(run.id, {
      completedAt,
      status,
      fetchedCount,
      newCount,
      updatedCount,
      duplicateCount,
      deactivatedCount,
      errorCount,
    });

    return {
      provider: providerName,
      fetchedCount,
      newCount,
      updatedCount,
      duplicateCount,
      deactivatedCount,
      errorCount,
      isMock,
      startedAt,
      completedAt,
      relevantCount,
      enrichedCount,
    };
  } catch (err) {
    const completedAt = new Date().toISOString();
    const errorMessage = err instanceof Error ? err.message : String(err);
    await syncRunRepo.update(run.id, {
      completedAt,
      status: "failed",
      fetchedCount,
      newCount,
      updatedCount,
      duplicateCount,
      deactivatedCount: 0,
      errorCount: errorCount + 1,
      errorMessage,
    });

    return {
      provider: providerName,
      fetchedCount,
      newCount,
      updatedCount,
      duplicateCount,
      deactivatedCount: 0,
      errorCount: errorCount + 1,
      isMock,
      startedAt,
      completedAt,
      errorMessage,
      relevantCount,
      enrichedCount,
    };
  }
}
