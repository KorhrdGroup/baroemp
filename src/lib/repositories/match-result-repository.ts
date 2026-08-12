import type { MatchResult } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseMatchResultRepository } from "./supabase/match-result.supabase-repository";

/**
 * 확정 저장되는 Match Result 저장소.
 * (매칭 위젯이 즉석에서 계산하는 matchingEngine 호출과는 별개로,
 *  검사 완료처럼 "결과를 영속 저장해야 하는" 이벤트에서만 이 저장소를 사용한다.)
 */
export interface MatchResultFilter {
  sourceId?: string;
  targetType?: MatchResult["targetType"];
}

export interface MatchResultRepository {
  create(input: Omit<MatchResult, "id" | "computedAt">): Promise<MatchResult>;
  findAll(filter?: MatchResultFilter): Promise<MatchResult[]>;
  /** 비회원 상태로 쌓인 매칭 결과를 회원에게 귀속시킨다. 반환값은 변경된 행 수. */
  linkAnonymousToUser(anonymousId: string, userId: string): Promise<number>;
}

function createMockMatchResultRepository(): MatchResultRepository {
  const store: MatchResult[] = [];
  return {
    // 실제 DB의 (user_id, target_type, target_id) UNIQUE 제약과 동일한 정책을 Mock에서도 지킨다:
    // 같은 사용자가 검사를 재시도해 동일 occupation이 다시 추천되면 새 행을 추가하는 대신 갱신한다
    // (과거 스냅샷은 assessment_results.recommendedOccupations에 그대로 남아 재현성을 보장한다).
    async create(input) {
      const idx = store.findIndex(
        (item) => item.sourceId === input.sourceId && item.targetType === input.targetType && item.targetId === input.targetId,
      );
      const now = new Date().toISOString();
      if (idx >= 0) {
        const updated: MatchResult = { ...store[idx], ...input, computedAt: now };
        store[idx] = updated;
        return updated;
      }
      const result: MatchResult = {
        ...input,
        id: `matchresult-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        computedAt: now,
      };
      store.unshift(result);
      return result;
    },
    async findAll(filter) {
      return store.filter((item) => {
        if (filter?.sourceId && item.sourceId !== filter.sourceId) return false;
        if (filter?.targetType && item.targetType !== filter.targetType) return false;
        return true;
      });
    },
    async linkAnonymousToUser(anonymousId, userId) {
      let count = 0;
      for (let i = 0; i < store.length; i++) {
        if (store[i].anonymousId === anonymousId) {
          store[i] = { ...store[i], userId, sourceId: userId, anonymousId: undefined };
          count++;
        }
      }
      return count;
    },
  };
}

let repository: MatchResultRepository | null = null;

export function getMatchResultRepository(): MatchResultRepository {
  if (!repository) {
    repository = resolveRepository("MatchResultRepository", {
      mock: createMockMatchResultRepository,
      supabase: createSupabaseMatchResultRepository,
    });
  }
  return repository;
}
