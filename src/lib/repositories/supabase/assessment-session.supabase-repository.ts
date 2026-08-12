import type { AssessmentSession } from "@/types";
import type {
  AssessmentSessionFilter,
  AssessmentSessionRepository,
} from "../assessment-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): AssessmentSession {
  return {
    id: String(row.id),
    assessmentId: String(row.assessment_id),
    userId: (row.user_id as string | null) ?? undefined,
    anonymousId: (row.anonymous_id as string | null) ?? undefined,
    status: row.status as AssessmentSession["status"],
    currentSection: String(row.current_section ?? "basic"),
    currentStep: Number(row.current_step ?? 0),
    totalSteps: Number(row.total_questions ?? 0),
    startedAt: String(row.started_at),
    updatedAt: String(row.updated_at ?? row.started_at),
    completedAt: (row.completed_at as string | null) ?? undefined,
  };
}

/** current_section 컬럼은 0018 migration에서 추가한다 (기존 0006/0016 스키마에는 없었다). */
export function createSupabaseAssessmentSessionRepository(): AssessmentSessionRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("assessment_sessions")
        .insert({
          assessment_id: input.assessmentId,
          user_id: input.userId || null,
          anonymous_id: input.anonymousId || null,
          status: "started",
          current_section: input.currentSection,
          current_step: 0,
          total_questions: input.totalSteps,
          started_at: now,
          updated_at: now,
        })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("AssessmentSessionRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async findById(id) {
      const result = await client.from("assessment_sessions").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("AssessmentSessionRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async findAll(filter?: AssessmentSessionFilter) {
      let query = client.from("assessment_sessions").select("*").order("started_at", { ascending: false });
      if (filter?.userId) query = query.eq("user_id", filter.userId);
      if (filter?.anonymousId) query = query.eq("anonymous_id", filter.anonymousId);
      if (filter?.assessmentId) query = query.eq("assessment_id", filter.assessmentId);
      if (filter?.status) query = query.eq("status", filter.status);
      const result = await query;
      const rows = unwrapList("AssessmentSessionRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async update(id, patch) {
      const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.currentSection !== undefined) row.current_section = patch.currentSection;
      if (patch.currentStep !== undefined) row.current_step = patch.currentStep;
      if (patch.totalSteps !== undefined) row.total_questions = patch.totalSteps;
      if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
      if (patch.userId !== undefined) row.user_id = patch.userId || null;
      if (patch.anonymousId !== undefined) row.anonymous_id = patch.anonymousId || null;

      const result = await client.from("assessment_sessions").update(row).eq("id", id).select("*").maybeSingle();
      const updated = unwrapMaybe("AssessmentSessionRepository.update", result);
      return updated ? mapRow(updated as Record<string, unknown>) : null;
    },
    async linkAnonymousToUser(anonymousId, userId) {
      const { data, error } = await client
        .from("assessment_sessions")
        .update({ user_id: userId, anonymous_id: null })
        .eq("anonymous_id", anonymousId)
        .select("id");
      if (error) throwDataSourceError("AssessmentSessionRepository.linkAnonymousToUser", error);
      return (data ?? []).length;
    },
  };
}
