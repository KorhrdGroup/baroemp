import type { CrudRepository } from "./types";
import type { ResumeTemplate, ResumeTemplateInput } from "@/types";
import { mockResumeTemplates } from "@/mocks/resumes.mock";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseResumeTemplateRepository } from "./supabase/resume-template.supabase-repository";

export type ResumeTemplateFilter = { status?: ResumeTemplate["status"] };
export type ResumeTemplateRepository = CrudRepository<ResumeTemplate, ResumeTemplateInput, ResumeTemplateFilter>;

function createMockResumeTemplateRepository(): ResumeTemplateRepository {
  return new InMemoryRepository<ResumeTemplate, ResumeTemplateInput, ResumeTemplateFilter>({
    initialData: mockResumeTemplates,
    idPrefix: "resume-template",
    applyFilter: (item, filter) => !filter?.status || item.status === filter.status,
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        id,
        code: input.code,
        name: input.name,
        description: input.description,
        targetType: input.targetType ?? "general",
        sections: input.sections ?? [],
        status: input.status ?? "active",
        orderIndex: input.orderIndex ?? 0,
        createdAt: now,
        updatedAt: now,
      } satisfies ResumeTemplate;
    },
    applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
  });
}

let repository: ResumeTemplateRepository | null = null;

export function getResumeTemplateRepository(): ResumeTemplateRepository {
  if (!repository) {
    repository = resolveRepository("ResumeTemplateRepository", {
      mock: createMockResumeTemplateRepository,
      supabase: createSupabaseResumeTemplateRepository,
    });
  }
  return repository;
}
