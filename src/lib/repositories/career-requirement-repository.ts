import type { CrudRepository } from "./types";
import type { CareerGapRequirement, CareerGapRequirementInput, CareerGapRequirementFilter } from "@/types";
import { mockCareerRequirements } from "@/mocks/career-requirements.mock";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseCareerRequirementRepository } from "./supabase/career-requirement.supabase-repository";

export type CareerRequirementRepository = CrudRepository<CareerGapRequirement, CareerGapRequirementInput, CareerGapRequirementFilter>;

function createMockCareerRequirementRepository(): CareerRequirementRepository {
  return new InMemoryRepository<CareerGapRequirement, CareerGapRequirementInput, CareerGapRequirementFilter>({
    initialData: mockCareerRequirements,
    idPrefix: "req",
    applyFilter: (item, filter) => {
      if (filter?.category && item.category !== filter.category) return false;
      if (filter?.status && item.status !== filter.status) return false;
      return true;
    },
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        id,
        key: input.key,
        name: input.name,
        category: input.category,
        description: input.description,
        matchingType: input.matchingType ?? "SKILL_KEYWORD",
        relatedQualificationId: input.relatedQualificationId,
        relatedSkillId: input.relatedSkillId,
        relatedContentTags: input.relatedContentTags ?? [],
        detectionKeywords: input.detectionKeywords ?? [],
        preparationDifficulty: input.preparationDifficulty ?? "MEDIUM",
        status: input.status ?? "active",
        createdAt: now,
        updatedAt: now,
      } satisfies CareerGapRequirement;
    },
    applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
  });
}

let repository: CareerRequirementRepository | null = null;

export function getCareerRequirementRepository(): CareerRequirementRepository {
  if (!repository) {
    repository = resolveRepository("CareerRequirementRepository", {
      mock: createMockCareerRequirementRepository,
      supabase: createSupabaseCareerRequirementRepository,
    });
  }
  return repository;
}
