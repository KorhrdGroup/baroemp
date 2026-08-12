import type { CoverLetterSection } from "@/types";
import type { CoverLetterSectionRepository } from "../cover-letter-section-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList } from "./query-helpers";

function mapRow(row: Record<string, unknown>): CoverLetterSection {
  return {
    id: String(row.id),
    coverLetterId: String(row.cover_letter_id),
    questionType: String(row.question_type),
    question: String(row.question),
    content: String(row.content ?? ""),
    characterLimit: (row.character_limit as number | null) ?? undefined,
    orderIndex: Number(row.order_index ?? 0),
  };
}

export function createSupabaseCoverLetterSectionRepository(): CoverLetterSectionRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async getSections(coverLetterId) {
      const result = await client
        .from("cover_letter_sections")
        .select("*")
        .eq("cover_letter_id", coverLetterId)
        .order("order_index");
      const rows = unwrapList("CoverLetterSectionRepository.getSections", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async replaceSections(coverLetterId, input) {
      const { error: deleteError } = await client.from("cover_letter_sections").delete().eq("cover_letter_id", coverLetterId);
      if (deleteError) throwDataSourceError("CoverLetterSectionRepository.replaceSections.delete", deleteError);
      if (input.length === 0) return [];

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("cover_letter_sections")
        .insert(
          input.map((item, i) => ({
            cover_letter_id: coverLetterId,
            question_type: item.questionType,
            question: item.question,
            content: item.content ?? "",
            character_limit: item.characterLimit,
            order_index: item.orderIndex ?? i,
            updated_at: now,
          })),
        )
        .select("*");
      if (error || !data) throwDataSourceError("CoverLetterSectionRepository.replaceSections.insert", error ?? new Error("no data"));
      return (data as Record<string, unknown>[]).map(mapRow).sort((a, b) => a.orderIndex - b.orderIndex);
    },
  };
}
