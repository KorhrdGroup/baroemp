import type { UserJobInterest } from "@/types";
import type { JobInterestFilter, JobInterestRepository } from "../job-interest-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): UserJobInterest {
  return {
    id: String(row.id),
    userId: (row.user_id as string | null) ?? undefined,
    anonymousId: (row.anonymous_id as string | null) ?? undefined,
    occupationId: String(row.occupation_id),
    occupationName: String(row.occupation_name ?? ""),
    interestScore: Number(row.interest_score ?? 0),
    source: String(row.source ?? "MANUAL"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * user_job_interests는 (user_id, occupation_id)와 (anonymous_id, occupation_id) 두 개의
 * partial unique index를 갖고 있어 단일 onConflict 대상을 지정할 수 없다.
 * 그래서 upsert 대신 조회 후 update/insert 분기로 구현한다 (Mock 구현과 동일한 정책).
 */
export function createSupabaseJobInterestRepository(): JobInterestRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter?: JobInterestFilter) {
      let query = client.from("user_job_interests").select("*").order("interest_score", { ascending: false });
      if (filter?.userId) query = query.eq("user_id", filter.userId);
      if (filter?.anonymousId) query = query.eq("anonymous_id", filter.anonymousId);
      const result = await query;
      const rows = unwrapList("JobInterestRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async upsert(input) {
      let existingQuery = client.from("user_job_interests").select("*").eq("occupation_id", input.occupationId);
      existingQuery = input.userId
        ? existingQuery.eq("user_id", input.userId)
        : existingQuery.eq("anonymous_id", input.anonymousId ?? "");
      const existingResult = await existingQuery.maybeSingle();
      const existingRow = unwrapMaybe("JobInterestRepository.upsert.find", existingResult);

      const now = new Date().toISOString();
      if (existingRow) {
        const result = await client
          .from("user_job_interests")
          .update({
            occupation_name: input.occupationName,
            interest_score: input.interestScore,
            source: input.source,
            updated_at: now,
          })
          .eq("id", existingRow.id as string)
          .select("*")
          .single();
        if (result.error || !result.data) {
          throwDataSourceError("JobInterestRepository.upsert.update", result.error ?? new Error("no data returned"));
        }
        return mapRow(result.data as Record<string, unknown>);
      }

      const { data, error } = await client
        .from("user_job_interests")
        .insert({
          user_id: input.userId || null,
          anonymous_id: input.anonymousId || null,
          occupation_id: input.occupationId,
          occupation_name: input.occupationName,
          interest_score: input.interestScore,
          source: input.source,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("JobInterestRepository.upsert.insert", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async linkAnonymousToUser(anonymousId, userId) {
      const { data, error } = await client
        .from("user_job_interests")
        .update({ user_id: userId, anonymous_id: null })
        .eq("anonymous_id", anonymousId)
        .select("id");
      if (error) throwDataSourceError("JobInterestRepository.linkAnonymousToUser", error);
      return (data ?? []).length;
    },
  };
}
