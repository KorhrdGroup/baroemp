import type { UserJobInterest, UserJobInterestUpsertInput } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseJobInterestRepository } from "./supabase/job-interest.supabase-repository";

export interface JobInterestFilter {
  userId?: string;
  anonymousId?: string;
}

export interface JobInterestRepository {
  findAll(filter?: JobInterestFilter): Promise<UserJobInterest[]>;
  /** 동일 사용자 + 직업에 대해 upsert (최신 interestScore/source로 갱신) */
  upsert(input: UserJobInterestUpsertInput): Promise<UserJobInterest>;
  linkAnonymousToUser(anonymousId: string, userId: string): Promise<number>;
}

function createMockJobInterestRepository(): JobInterestRepository {
  const store: UserJobInterest[] = [];
  return {
    async findAll(filter) {
      return store.filter((item) => {
        if (filter?.userId && item.userId !== filter.userId) return false;
        if (filter?.anonymousId && item.anonymousId !== filter.anonymousId) return false;
        return true;
      });
    },
    async upsert(input) {
      const idx = store.findIndex(
        (item) =>
          item.occupationId === input.occupationId &&
          ((input.userId && item.userId === input.userId) ||
            (input.anonymousId && item.anonymousId === input.anonymousId)),
      );
      const now = new Date().toISOString();
      if (idx >= 0) {
        const updated: UserJobInterest = { ...store[idx], ...input, updatedAt: now };
        store[idx] = updated;
        return updated;
      }
      const created: UserJobInterest = {
        ...input,
        id: `jobinterest-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: now,
        updatedAt: now,
      };
      store.unshift(created);
      return created;
    },
    async linkAnonymousToUser(anonymousId, userId) {
      let count = 0;
      for (let i = 0; i < store.length; i++) {
        if (store[i].anonymousId === anonymousId) {
          store[i] = { ...store[i], userId, anonymousId: undefined };
          count++;
        }
      }
      return count;
    },
  };
}

let repository: JobInterestRepository | null = null;

export function getJobInterestRepository(): JobInterestRepository {
  if (!repository) {
    repository = resolveRepository("JobInterestRepository", {
      mock: createMockJobInterestRepository,
      supabase: createSupabaseJobInterestRepository,
    });
  }
  return repository;
}
