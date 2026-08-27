import type { AssessmentResult } from "@/types";
import type { AssessmentResultFilter, AssessmentResultRepository } from "../assessment-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): AssessmentResult {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    assessmentId: String(row.assessment_id),
    userId: (row.user_id as string | null) ?? undefined,
    anonymousId: (row.anonymous_id as string | null) ?? undefined,
    dimensionScores: (row.dimension_scores as Record<string, number>) ?? {},
    extractedProfile: (row.extracted_profile as AssessmentResult["extractedProfile"]) ?? {},
    generatedTags: (row.generated_tags as string[]) ?? [],
    recommendations: (row.recommended_occupations as AssessmentResult["recommendations"]) ?? [],
    summary: String(row.summary ?? ""),
    engineVersion: String(row.engine_version ?? "CAREER_ASSESSMENT_V1"),
    completedAt: String(row.completed_at),
  };
}

/**
 * 재현성(reproducibility) 요구사항: engine_version / dimension_scores / recommended_occupations
 * (각 항목에 reasons/risks/readinessScore 등 포함) / extracted_profile / generated_tags를
 * 모두 그대로 저장한다. raw_result에도 동일 payload를 중복 저장해 향후 스키마 변경과 무관하게
 * "당시 계산된 원본 결과"를 감사할 수 있게 한다.
 */
export function createSupabaseAssessmentResultRepository(): AssessmentResultRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter?: AssessmentResultFilter) {
      let query = client.from("assessment_results").select("*").order("completed_at", { ascending: false });
      if (filter?.userId) query = query.eq("user_id", filter.userId);
      if (filter?.anonymousId) query = query.eq("anonymous_id", filter.anonymousId);
      if (filter?.assessmentId) query = query.eq("assessment_id", filter.assessmentId);
      if (filter?.sessionId) query = query.eq("session_id", filter.sessionId);
      const result = await query;
      const rows = unwrapList("AssessmentResultRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("assessment_results").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("AssessmentResultRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async findBySessionId(sessionId) {
      /*
       * 세션당 결과는 하나지만, 과거에 중복 저장된 데이터가 남아 있을 수 있다.
       * single 로 읽으면 그런 세션에서 결과 화면이 통째로 열리지 않으므로
       * 최신 한 건만 집어 온다.
       */
      const result = await client
        .from("assessment_results")
        .select("*")
        .eq("session_id", sessionId)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const row = unwrapMaybe("AssessmentResultRepository.findBySessionId", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const payload = {
        session_id: input.sessionId,
        assessment_id: input.assessmentId,
        user_id: input.userId || null,
        anonymous_id: input.anonymousId || null,
        summary: input.summary,
        dimension_scores: input.dimensionScores,
        extracted_profile: input.extractedProfile,
        generated_tags: input.generatedTags,
        recommended_occupations: input.recommendations,
        raw_result: { dimensionScores: input.dimensionScores, recommendations: input.recommendations },
        engine_version: input.engineVersion,
        completed_at: now,
      };
      const { data, error } = await client.from("assessment_results").insert(payload).select("*").single();
      if (error || !data) throwDataSourceError("AssessmentResultRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async linkAnonymousToUser(anonymousId, userId) {
      const { data, error } = await client
        .from("assessment_results")
        .update({ user_id: userId, anonymous_id: null })
        .eq("anonymous_id", anonymousId)
        .select("id");
      if (error) throwDataSourceError("AssessmentResultRepository.linkAnonymousToUser", error);
      return (data ?? []).length;
    },
  };
}
