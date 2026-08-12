import type { AssessmentAnswerRecord } from "@/types";
import type { AssessmentAnswerRepository } from "../assessment-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList } from "./query-helpers";

function mapRow(row: Record<string, unknown>): AssessmentAnswerRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    questionId: String(row.question_id),
    optionId: (row.option_id as string | null) ?? undefined,
    optionIds: (row.option_ids as string[] | null) ?? undefined,
    rawValue: row.answer_value ?? row.raw_value ?? undefined,
    answeredAt: String(row.updated_at ?? row.created_at),
  };
}

/**
 * assessment_answers(session_id, question_id) unique index를 이용해 upsert 한다
 * (0016 migration에서 추가된 assessment_answers_session_question_uidx 참고).
 */
export function createSupabaseAssessmentAnswerRepository(): AssessmentAnswerRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async upsert(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("assessment_answers")
        .upsert(
          {
            session_id: input.sessionId,
            question_id: input.questionId,
            option_id: input.optionId ?? null,
            option_ids: input.optionIds ?? [],
            raw_value: input.rawValue ?? null,
            answer_value: input.rawValue ?? null,
            updated_at: now,
          },
          { onConflict: "session_id,question_id" },
        )
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("AssessmentAnswerRepository.upsert", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async findBySession(sessionId) {
      const result = await client
        .from("assessment_answers")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      const rows = unwrapList("AssessmentAnswerRepository.findBySession", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
  };
}
