import type { CrudRepository } from "./types";
import type { EmploymentDestination, EmploymentDestinationInput, EmploymentDestinationFilter } from "@/types";
import { mockEmploymentDestinations } from "@/mocks/employment-destinations.mock";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseEmploymentDestinationRepository } from "./supabase/employment-destination.supabase-repository";

export type EmploymentDestinationRepository = CrudRepository<
  EmploymentDestination,
  EmploymentDestinationInput,
  EmploymentDestinationFilter
>;

function createMockEmploymentDestinationRepository(): EmploymentDestinationRepository {
  return new InMemoryRepository<EmploymentDestination, EmploymentDestinationInput, EmploymentDestinationFilter>({
    initialData: mockEmploymentDestinations,
    idPrefix: "dest",
    applyFilter: (item, filter) => {
      if (filter?.occupationId && item.occupationId !== filter.occupationId) return false;
      if (filter?.status && item.status !== filter.status) return false;
      return true;
    },
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        id,
        occupationId: input.occupationId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        category: input.category,
        tags: input.tags ?? [],
        classifierKeywords: input.classifierKeywords ?? [],
        status: input.status ?? "active",
        orderIndex: input.orderIndex ?? 0,
        createdAt: now,
        updatedAt: now,
      } satisfies EmploymentDestination;
    },
    applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
  });
}

let repository: EmploymentDestinationRepository | null = null;

export function getEmploymentDestinationRepository(): EmploymentDestinationRepository {
  if (!repository) {
    repository = resolveRepository("EmploymentDestinationRepository", {
      mock: createMockEmploymentDestinationRepository,
      supabase: createSupabaseEmploymentDestinationRepository,
    });
  }
  return repository;
}
