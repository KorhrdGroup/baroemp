import type { MarketRequirementSnapshot, MarketRequirementSnapshotInput, MarketRequirementSnapshotFilter } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseMarketSnapshotRepository } from "./supabase/market-snapshot.supabase-repository";

export interface MarketSnapshotRepository {
  create(input: MarketRequirementSnapshotInput): Promise<MarketRequirementSnapshot>;
  /** 해당 scope(occupation/destination)의 가장 최근 snapshot 하나를 반환한다. 없으면 null. */
  findLatest(filter: MarketRequirementSnapshotFilter): Promise<MarketRequirementSnapshot | null>;
  findAll(filter?: MarketRequirementSnapshotFilter): Promise<MarketRequirementSnapshot[]>;
}

function scopeKey(occupationId?: string, destinationId?: string) {
  return `${occupationId ?? "none"}::${destinationId ?? "none"}`;
}

function createMockMarketSnapshotRepository(): MarketSnapshotRepository {
  let items: MarketRequirementSnapshot[] = [];
  let seq = 0;

  return {
    async create(input) {
      seq += 1;
      const entity: MarketRequirementSnapshot = {
        ...input,
        id: `snapshot-${Date.now()}-${seq}`,
        calculatedAt: input.calculatedAt ?? new Date().toISOString(),
      };
      items = [entity, ...items];
      return entity;
    },
    async findLatest(filter) {
      const matches = items
        .filter((item) => scopeKey(item.occupationId, item.destinationId) === scopeKey(filter.occupationId, filter.destinationId))
        .sort((a, b) => (a.calculatedAt < b.calculatedAt ? 1 : -1));
      return matches[0] ?? null;
    },
    async findAll(filter) {
      if (!filter) return [...items];
      return items.filter(
        (item) =>
          (!filter.occupationId || item.occupationId === filter.occupationId) &&
          (!filter.destinationId || item.destinationId === filter.destinationId),
      );
    },
  };
}

let repository: MarketSnapshotRepository | null = null;

export function getMarketSnapshotRepository(): MarketSnapshotRepository {
  if (!repository) {
    repository = resolveRepository("MarketSnapshotRepository", {
      mock: createMockMarketSnapshotRepository,
      supabase: createSupabaseMarketSnapshotRepository,
    });
  }
  return repository;
}
