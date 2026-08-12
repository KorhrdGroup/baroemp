import type { CrudRepository } from "./types";
import type { Occupation, OccupationInput, OccupationMatchingRule } from "@/types";
import { mockOccupationMatchingRules, mockOccupations } from "@/mocks/occupations.mock";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { isProductionEnv, isSupabaseMode } from "@/lib/data/mode";
import { DataSourceError } from "@/lib/data/errors";
import {
  createSupabaseOccupationRepository,
  fetchSupabaseOccupationMatchingRules,
} from "./supabase/occupation.supabase-repository";

export type OccupationRepository = CrudRepository<Occupation, OccupationInput>;

function createMockOccupationRepository(): OccupationRepository {
  return new InMemoryRepository<Occupation, OccupationInput>({
    initialData: mockOccupations,
    idPrefix: "occ",
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        ...input,
        id,
        name: input.name,
        description: input.description ?? "",
        isMidcareerFriendly: input.isMidcareerFriendly ?? true,
        status: input.status ?? "published",
        tags: input.tags ?? [],
        relatedContentIds: input.relatedContentIds ?? [],
        requiredQualifications: input.requiredQualifications ?? [],
        createdAt: now,
        updatedAt: now,
      } satisfies Occupation;
    },
    applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
  });
}

let repository: OccupationRepository | null = null;

export function getOccupationRepository(): OccupationRepository {
  if (!repository) {
    repository = resolveRepository("OccupationRepository", {
      mock: createMockOccupationRepository,
      supabase: createSupabaseOccupationRepository,
    });
  }
  return repository;
}

let mockMatchingRulesCache: OccupationMatchingRule[] | null = null;

/**
 * Occupation Matching Rule은 별도 CRUD UI가 없는 V1 특성상
 * Mock Mode에서는 메모리 배열로, Supabase Mode에서는 occupation_matching_rules 테이블에서 조회한다.
 * resolveRepository와 동일한 정책(운영 + 클라이언트 생성 실패 시 에러)을 따른다.
 */
export async function getOccupationMatchingRules(occupationId?: string): Promise<OccupationMatchingRule[]> {
  if (!isSupabaseMode()) {
    if (!mockMatchingRulesCache) mockMatchingRulesCache = [...mockOccupationMatchingRules];
    return occupationId
      ? mockMatchingRulesCache.filter((rule) => rule.occupationId === occupationId)
      : mockMatchingRulesCache;
  }

  const rules = await fetchSupabaseOccupationMatchingRules(occupationId);
  if (rules) return rules;

  const message =
    "[OccupationMatchingRules] DATA_SOURCE_MODE=supabase 이지만 Supabase 클라이언트를 생성할 수 없습니다.";
  if (isProductionEnv()) throw new DataSourceError(message);
  console.warn(`${message} (개발환경이므로 Mock으로 폴백합니다)`);
  if (!mockMatchingRulesCache) mockMatchingRulesCache = [...mockOccupationMatchingRules];
  return occupationId
    ? mockMatchingRulesCache.filter((rule) => rule.occupationId === occupationId)
    : mockMatchingRulesCache;
}

export async function listActiveOccupations(): Promise<Occupation[]> {
  const repo = getOccupationRepository();
  const all = await repo.findAll();
  return all.filter((o) => o.status === "published");
}
