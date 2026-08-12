import type { CrudRepository } from "./types";
import type { ExperienceBankItem, ExperienceBankItemInput } from "@/types";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseExperienceBankRepository } from "./supabase/experience-bank.supabase-repository";

export type ExperienceBankFilter = { userId?: string };
export type ExperienceBankRepository = CrudRepository<
  ExperienceBankItem,
  ExperienceBankItemInput & { userId?: string },
  ExperienceBankFilter
>;

function createMockExperienceBankRepository(): ExperienceBankRepository {
  return new InMemoryRepository<ExperienceBankItem, ExperienceBankItemInput & { userId?: string }, ExperienceBankFilter>({
    initialData: [],
    idPrefix: "experience-bank",
    applyFilter: (item, filter) => !filter.userId || item.userId === filter.userId,
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        id,
        userId: input.userId ?? "",
        title: input.title,
        situation: input.situation,
        task: input.task,
        action: input.action,
        result: input.result,
        skills: input.skills ?? [],
        relatedOccupations: input.relatedOccupations ?? [],
        createdAt: now,
        updatedAt: now,
      } satisfies ExperienceBankItem;
    },
    applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
  });
}

let repository: ExperienceBankRepository | null = null;

export function getExperienceBankRepository(): ExperienceBankRepository {
  if (!repository) {
    repository = resolveRepository("ExperienceBankRepository", {
      mock: createMockExperienceBankRepository,
      supabase: createSupabaseExperienceBankRepository,
    });
  }
  return repository;
}
