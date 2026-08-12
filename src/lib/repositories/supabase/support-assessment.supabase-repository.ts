import type { SupportAssessmentSession } from "@/types";
import type {
  SupportAssessmentSessionFilter,
  SupportAssessmentSessionRepository,
} from "../support-assessment-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): SupportAssessmentSession {
  return {
    id: String(row.id),
    userId: (row.user_id as string | null) ?? undefined,
    anonymousId: (row.anonymous_id as string | null) ?? undefined,
    status: (row.status as SupportAssessmentSession["status"]) ?? "in_progress",
    answers: (row.answers as SupportAssessmentSession["answers"]) ?? {},
    startedAt: String(row.started_at),
    updatedAt: String(row.updated_at ?? row.started_at),
    completedAt: (row.completed_at as string | null) ?? undefined,
  };
}

export function createSupabaseSupportAssessmentRepository(): SupportAssessmentSessionRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("support_assessment_sessions")
        .insert({
          user_id: input.userId || null,
          anonymous_id: input.anonymousId || null,
          status: "in_progress",
          answers: input.answers ?? {},
          started_at: now,
          updated_at: now,
        })
        .select("*")
        .single();
      if (error || !data) {
        throwDataSourceError("SupportAssessmentSessionRepository.create", error ?? new Error("no data returned"));
      }
      return mapRow(data as Record<string, unknown>);
    },
    async findById(id) {
      const result = await client.from("support_assessment_sessions").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("SupportAssessmentSessionRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async findAll(filter?: SupportAssessmentSessionFilter) {
      let query = client.from("support_assessment_sessions").select("*").order("started_at", { ascending: false });
      if (filter?.userId) query = query.eq("user_id", filter.userId);
      if (filter?.anonymousId) query = query.eq("anonymous_id", filter.anonymousId);
      if (filter?.status) query = query.eq("status", filter.status);
      const result = await query;
      const rows = unwrapList("SupportAssessmentSessionRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async update(id, patch) {
      const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.answers !== undefined) row.answers = patch.answers;
      if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
      if (patch.userId !== undefined) row.user_id = patch.userId || null;
      if (patch.anonymousId !== undefined) row.anonymous_id = patch.anonymousId || null;

      const result = await client.from("support_assessment_sessions").update(row).eq("id", id).select("*").maybeSingle();
      const updated = unwrapMaybe("SupportAssessmentSessionRepository.update", result);
      return updated ? mapRow(updated as Record<string, unknown>) : null;
    },
    async linkAnonymousToUser(anonymousId, userId) {
      const { data, error } = await client
        .from("support_assessment_sessions")
        .update({ user_id: userId, anonymous_id: null })
        .eq("anonymous_id", anonymousId)
        .select("id");
      if (error) throwDataSourceError("SupportAssessmentSessionRepository.linkAnonymousToUser", error);
      return (data ?? []).length;
    },
  };
}
