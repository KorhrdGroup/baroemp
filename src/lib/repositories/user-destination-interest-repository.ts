import type { UserEmploymentDestinationInterest, UserEmploymentDestinationInterestInput } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseUserDestinationInterestRepository } from "./supabase/user-destination-interest.supabase-repository";

export interface UserDestinationInterestRepository {
  upsert(input: UserEmploymentDestinationInterestInput): Promise<UserEmploymentDestinationInterest>;
  findByUserId(userId: string): Promise<UserEmploymentDestinationInterest[]>;
}

function createMockUserDestinationInterestRepository(): UserDestinationInterestRepository {
  let items: UserEmploymentDestinationInterest[] = [];
  let seq = 0;

  return {
    async upsert(input) {
      const existing = items.find(
        (item) =>
          item.userId === input.userId &&
          item.occupationId === input.occupationId &&
          item.employmentDestinationId === input.employmentDestinationId,
      );
      if (existing) return existing;
      seq += 1;
      const entity: UserEmploymentDestinationInterest = {
        ...input,
        id: `dest-interest-${Date.now()}-${seq}`,
        createdAt: new Date().toISOString(),
      };
      items = [entity, ...items];
      return entity;
    },
    async findByUserId(userId) {
      return items.filter((item) => item.userId === userId);
    },
  };
}

let repository: UserDestinationInterestRepository | null = null;

export function getUserDestinationInterestRepository(): UserDestinationInterestRepository {
  if (!repository) {
    repository = resolveRepository("UserDestinationInterestRepository", {
      mock: createMockUserDestinationInterestRepository,
      supabase: createSupabaseUserDestinationInterestRepository,
    });
  }
  return repository;
}
