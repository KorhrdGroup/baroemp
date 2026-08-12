import type { CrudRepository } from "./types";
import type { Lead, LeadGrade } from "@/types";
import { mockLeads } from "@/mocks/leads.mock";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseLeadRepository } from "./supabase/lead.supabase-repository";

export type LeadInput = Partial<Omit<Lead, "id" | "createdAt">> & { userId: string; name: string };

export interface LeadFilter {
  grade?: LeadGrade;
  status?: Lead["status"];
}

export type LeadRepository = CrudRepository<Lead, LeadInput, LeadFilter>;

function createMockLeadRepository(): LeadRepository {
  return new InMemoryRepository<Lead, LeadInput, LeadFilter>({
    initialData: mockLeads,
    idPrefix: "lead",
    applyFilter: (item, filter) => {
      if (filter.grade && item.score.grade !== filter.grade) return false;
      if (filter.status && item.status !== filter.status) return false;
      return true;
    },
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        ...input,
        id,
        userId: input.userId,
        name: input.name,
        recentActionLabel: input.recentActionLabel ?? "",
        status: input.status ?? "new",
        score: input.score ?? { totalScore: 0, grade: "D", signals: [] },
        lastActivityAt: input.lastActivityAt ?? now,
        createdAt: now,
      } satisfies Lead;
    },
    applyUpdate: (item, input) => ({ ...item, ...input }),
  });
}

let repository: LeadRepository | null = null;

export function getLeadRepository(): LeadRepository {
  if (!repository) {
    repository = resolveRepository("LeadRepository", {
      mock: createMockLeadRepository,
      supabase: createSupabaseLeadRepository,
    });
  }
  return repository;
}
