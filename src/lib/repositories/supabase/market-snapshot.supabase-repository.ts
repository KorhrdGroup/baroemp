import type { MarketRequirementSnapshot, MarketRequirementSnapshotInput } from "@/types";
import type { MarketSnapshotRepository } from "../market-snapshot-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): MarketRequirementSnapshot {
  return {
    id: String(row.id),
    occupationId: (row.occupation_id as string | null) ?? undefined,
    destinationId: (row.destination_id as string | null) ?? undefined,
    periodDays: Number(row.period_days ?? 90),
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    sampleSize: Number(row.sample_size ?? 0),
    confidence: (row.confidence as MarketRequirementSnapshot["confidence"]) ?? "LOW",
    requirements: (row.requirements as MarketRequirementSnapshot["requirements"] | null) ?? [],
    isMockData: Boolean(row.is_mock_data),
    calculatedAt: String(row.calculated_at),
  };
}

function toRow(input: MarketRequirementSnapshotInput): Record<string, unknown> {
  return {
    occupation_id: input.occupationId ?? null,
    destination_id: input.destinationId ?? null,
    period_days: input.periodDays,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    sample_size: input.sampleSize,
    confidence: input.confidence,
    requirements: input.requirements,
    is_mock_data: input.isMockData,
    calculated_at: input.calculatedAt ?? new Date().toISOString(),
  };
}

export function createSupabaseMarketSnapshotRepository(): MarketSnapshotRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async create(input) {
      const { data, error } = await client
        .from("market_requirement_snapshots")
        .insert(toRow(input))
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("MarketSnapshotRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async findLatest(filter) {
      let query = client.from("market_requirement_snapshots").select("*").order("calculated_at", { ascending: false }).limit(1);
      query = filter.occupationId ? query.eq("occupation_id", filter.occupationId) : query.is("occupation_id", null);
      query = filter.destinationId ? query.eq("destination_id", filter.destinationId) : query.is("destination_id", null);
      const result = await query.maybeSingle();
      const row = unwrapMaybe("MarketSnapshotRepository.findLatest", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async findAll(filter) {
      let query = client.from("market_requirement_snapshots").select("*").order("calculated_at", { ascending: false });
      if (filter?.occupationId) query = query.eq("occupation_id", filter.occupationId);
      if (filter?.destinationId) query = query.eq("destination_id", filter.destinationId);
      const result = await query;
      const rows = unwrapList("MarketSnapshotRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
  };
}
