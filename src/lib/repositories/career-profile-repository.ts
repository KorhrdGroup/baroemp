import type { CrudRepository } from "./types";
import type { CareerProfile, CareerProfileInput } from "@/types";
import { mockCareerProfiles } from "@/mocks/career-profiles.mock";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseCareerProfileRepository } from "./supabase/career-profile.supabase-repository";

export type CareerProfileRepository = CrudRepository<
  CareerProfile,
  CareerProfileInput & { userId?: string },
  { userId?: string }
>;

function createMockCareerProfileRepository(): CareerProfileRepository {
  return new InMemoryRepository<
    CareerProfile,
    CareerProfileInput & { userId?: string },
    { userId?: string }
  >({
    initialData: mockCareerProfiles,
    idPrefix: "profile",
    applyFilter: (item, filter) => !filter.userId || item.userId === filter.userId,
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        id,
        userId: input.userId ?? "",
        createdAt: now,
        updatedAt: now,
        ...input,
      } satisfies CareerProfile;
    },
    applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
  });
}

let repository: CareerProfileRepository | null = null;

export function getCareerProfileRepository(): CareerProfileRepository {
  if (!repository) {
    repository = resolveRepository("CareerProfileRepository", {
      mock: createMockCareerProfileRepository,
      supabase: createSupabaseCareerProfileRepository,
    });
  }
  return repository;
}

/** userId 기준으로 프로필을 조회하는 편의 함수. */
export async function findCareerProfileByUserId(userId: string): Promise<CareerProfile | null> {
  const repo = getCareerProfileRepository();
  const all = await repo.findAll({ userId });
  return all[0] ?? null;
}
