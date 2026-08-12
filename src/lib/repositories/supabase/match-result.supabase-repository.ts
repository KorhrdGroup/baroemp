import type { MatchResult } from "@/types";
import type { MatchResultFilter, MatchResultRepository } from "../match-result-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): MatchResult {
  return {
    id: String(row.id),
    sourceType: (row.source_type as MatchResult["sourceType"]) ?? "user",
    sourceId: String(row.source_id ?? row.user_id ?? ""),
    userId: (row.user_id as string | null) ?? undefined,
    anonymousId: (row.anonymous_id as string | null) ?? undefined,
    targetType: row.target_type as MatchResult["targetType"],
    targetId: String(row.target_id),
    score: Number(row.score ?? 0),
    grade: (row.grade as MatchResult["grade"]) ?? undefined,
    reasons: (row.reason as MatchResult["reasons"]) ?? [],
    detail: (row.detail as MatchResult["detail"]) ?? undefined,
    engineVersion: (row.engine_version as string | null) ?? undefined,
    computedAt: String(row.created_at),
  };
}

export function createSupabaseMatchResultRepository(): MatchResultRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    // match_results.(user_id, target_type, target_id)에 UNIQUE 제약이 있으므로
    // 재시도 검사로 동일 조합이 다시 계산되면 새 행 INSERT 대신 기존 행을 갱신한다
    // (부분 인덱스라 supabase-js upsert(onConflict)의 자동 추론에 의존하지 않고 조회 후 분기한다).
    async create(input) {
      const now = new Date().toISOString();
      const row = {
        source_type: input.sourceType,
        source_id: input.sourceId,
        user_id: input.userId || null,
        anonymous_id: input.anonymousId || null,
        target_type: input.targetType,
        target_id: input.targetId,
        score: input.score,
        grade: input.grade ?? null,
        reason: input.reasons,
        detail: input.detail ?? {},
        engine_version: input.engineVersion ?? "rule-v1",
        updated_at: now,
      };

      let existingQuery = client
        .from("match_results")
        .select("id")
        .eq("target_type", input.targetType)
        .eq("target_id", input.targetId);
      existingQuery = input.userId
        ? existingQuery.eq("user_id", input.userId)
        : existingQuery.eq("anonymous_id", input.anonymousId ?? "");
      const existingResult = await existingQuery.maybeSingle();
      const existingRow = unwrapMaybe("MatchResultRepository.create.find", existingResult);

      if (existingRow) {
        const result = await client.from("match_results").update(row).eq("id", existingRow.id as string).select("*").single();
        if (result.error || !result.data) {
          throwDataSourceError("MatchResultRepository.create.update", result.error ?? new Error("no data returned"));
        }
        return mapRow(result.data as Record<string, unknown>);
      }

      const { data, error } = await client
        .from("match_results")
        .insert({ ...row, created_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("MatchResultRepository.create.insert", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async findAll(filter?: MatchResultFilter) {
      let query = client.from("match_results").select("*").order("created_at", { ascending: false });
      if (filter?.sourceId) query = query.eq("source_id", filter.sourceId);
      if (filter?.targetType) query = query.eq("target_type", filter.targetType);
      const result = await query;
      const rows = unwrapList("MatchResultRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async linkAnonymousToUser(anonymousId, userId) {
      const { data, error } = await client
        .from("match_results")
        .update({ user_id: userId, source_id: userId, anonymous_id: null })
        .eq("anonymous_id", anonymousId)
        .select("id");
      if (error) throwDataSourceError("MatchResultRepository.linkAnonymousToUser", error);
      return (data ?? []).length;
    },
  };
}
