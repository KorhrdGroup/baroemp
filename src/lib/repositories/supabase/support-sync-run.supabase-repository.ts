import type { SupportSyncRun, SupportSyncRunInput } from "@/types";
import type { SupportSyncRunRepository } from "../support-sync-run-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): SupportSyncRun {
  return {
    id: String(row.id),
    provider: String(row.provider),
    startedAt: String(row.started_at),
    completedAt: (row.completed_at as string | null) ?? undefined,
    status: (row.status as SupportSyncRun["status"]) ?? "running",
    fetchedCount: Number(row.fetched_count ?? 0),
    newCount: Number(row.new_count ?? 0),
    updatedCount: Number(row.updated_count ?? 0),
    duplicateCount: Number(row.duplicate_count ?? 0),
    deactivatedCount: Number(row.deactivated_count ?? 0),
    errorCount: Number(row.error_count ?? 0),
    errorMessage: (row.error_message as string | null) ?? undefined,
    triggeredBy: (row.triggered_by as string | null) ?? undefined,
    createdAt: String(row.created_at),
  };
}

function toRow(input: Partial<SupportSyncRunInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.provider !== undefined) row.provider = input.provider;
  if (input.startedAt !== undefined) row.started_at = input.startedAt;
  if (input.completedAt !== undefined) row.completed_at = input.completedAt;
  if (input.status !== undefined) row.status = input.status;
  if (input.fetchedCount !== undefined) row.fetched_count = input.fetchedCount;
  if (input.newCount !== undefined) row.new_count = input.newCount;
  if (input.updatedCount !== undefined) row.updated_count = input.updatedCount;
  if (input.duplicateCount !== undefined) row.duplicate_count = input.duplicateCount;
  if (input.deactivatedCount !== undefined) row.deactivated_count = input.deactivatedCount;
  if (input.errorCount !== undefined) row.error_count = input.errorCount;
  if (input.errorMessage !== undefined) row.error_message = input.errorMessage;
  if (input.triggeredBy !== undefined) row.triggered_by = input.triggeredBy;
  return row;
}

export function createSupabaseSupportSyncRunRepository(): SupportSyncRunRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(limit = 50) {
      const result = await client
        .from("support_sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);
      const rows = unwrapList("SupportSyncRunRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findLatestByProvider(provider) {
      const result = await client
        .from("support_sync_runs")
        .select("*")
        .eq("provider", provider)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const row = unwrapMaybe("SupportSyncRunRepository.findLatestByProvider", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("support_sync_runs")
        .insert({
          ...toRow(input),
          provider: input.provider,
          started_at: input.startedAt ?? now,
          status: input.status ?? "running",
          created_at: now,
        })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("SupportSyncRunRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client.from("support_sync_runs").update(toRow(input)).eq("id", id).select("*").maybeSingle();
      const row = unwrapMaybe("SupportSyncRunRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
  };
}
