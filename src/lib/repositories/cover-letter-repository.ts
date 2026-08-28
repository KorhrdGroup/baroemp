import type { CrudRepository } from "./types";
import type { CoverLetter, CoverLetterInput } from "@/types";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseCoverLetterRepository } from "./supabase/cover-letter.supabase-repository";

export type CoverLetterFilter = { userId?: string };
export type CoverLetterRepository = CrudRepository<CoverLetter, CoverLetterInput, CoverLetterFilter>;

function createMockCoverLetterRepository(): CoverLetterRepository {
  return new InMemoryRepository<CoverLetter, CoverLetterInput, CoverLetterFilter>({
    initialData: [],
    idPrefix: "cover-letter",
    applyFilter: (item, filter) => !filter.userId || item.userId === filter.userId,
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        id,
        userId: input.userId,
        title: input.title,
        resumeId: input.resumeId,
        targetJobId: input.targetJobId,
        targetOccupationId: input.targetOccupationId,
        templateId: input.templateId,
        experienceBankIds: input.experienceBankIds ?? [],
        status: input.status ?? "draft",
        version: input.version ?? 1,
        createdAt: now,
        updatedAt: now,
      } satisfies CoverLetter;
    },
    applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
  });
}

let repository: CoverLetterRepository | null = null;

export function getCoverLetterRepository(): CoverLetterRepository {
  if (!repository) {
    repository = resolveRepository("CoverLetterRepository", {
      mock: createMockCoverLetterRepository,
      supabase: createSupabaseCoverLetterRepository,
    });
  }
  return repository;
}
