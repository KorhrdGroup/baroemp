import type { SupportSyncRun, SupportSyncRunInput } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseSupportSyncRunRepository } from "./supabase/support-sync-run.supabase-repository";

export interface SupportSyncRunRepository {
  findAll(limit?: number): Promise<SupportSyncRun[]>;
  findLatestByProvider(provider: string): Promise<SupportSyncRun | null>;
  create(input: SupportSyncRunInput): Promise<SupportSyncRun>;
  update(id: string, input: Partial<SupportSyncRunInput>): Promise<SupportSyncRun | null>;
}

function createMockSupportSyncRunRepository(): SupportSyncRunRepository {
  const store: SupportSyncRun[] = [];
  return {
    async findAll(limit = 50) {
      return [...store].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)).slice(0, limit);
    },
    async findLatestByProvider(provider) {
      const items = store.filter((r) => r.provider === provider).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
      return items[0] ?? null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const created: SupportSyncRun = {
        id: `support-syncrun-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        provider: input.provider,
        startedAt: input.startedAt ?? now,
        completedAt: input.completedAt,
        status: input.status ?? "running",
        fetchedCount: input.fetchedCount ?? 0,
        newCount: input.newCount ?? 0,
        updatedCount: input.updatedCount ?? 0,
        duplicateCount: input.duplicateCount ?? 0,
        deactivatedCount: input.deactivatedCount ?? 0,
        errorCount: input.errorCount ?? 0,
        errorMessage: input.errorMessage,
        triggeredBy: input.triggeredBy,
        createdAt: now,
      };
      store.unshift(created);
      return created;
    },
    async update(id, input) {
      const idx = store.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      const updated = { ...store[idx], ...input };
      store[idx] = updated;
      return updated;
    },
  };
}

let repository: SupportSyncRunRepository | null = null;

export function getSupportSyncRunRepository(): SupportSyncRunRepository {
  if (!repository) {
    repository = resolveRepository("SupportSyncRunRepository", {
      mock: createMockSupportSyncRunRepository,
      supabase: createSupabaseSupportSyncRunRepository,
    });
  }
  return repository;
}
