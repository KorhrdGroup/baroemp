import type { CoverLetterTemplate, CoverLetterTemplateInput } from "@/types";
import type { CoverLetterTemplateRepository } from "../cover-letter-template-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): CoverLetterTemplate {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    description: (row.description as string | null) ?? undefined,
    targetType: String(row.target_type ?? "general"),
    defaultQuestions: (row.default_questions as CoverLetterTemplate["defaultQuestions"] | null) ?? [],
    status: (row.status as CoverLetterTemplate["status"]) ?? "active",
    orderIndex: Number(row.order_index ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<CoverLetterTemplateInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.code !== undefined) row.code = input.code;
  if (input.name !== undefined) row.name = input.name;
  if (input.description !== undefined) row.description = input.description;
  if (input.targetType !== undefined) row.target_type = input.targetType;
  if (input.defaultQuestions !== undefined) row.default_questions = input.defaultQuestions;
  if (input.status !== undefined) row.status = input.status;
  if (input.orderIndex !== undefined) row.order_index = input.orderIndex;
  return row;
}

export function createSupabaseCoverLetterTemplateRepository(): CoverLetterTemplateRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      let query = client.from("cover_letter_templates").select("*").order("order_index", { ascending: true });
      if (filter?.status) query = query.eq("status", filter.status);
      const result = await query;
      const rows = unwrapList("CoverLetterTemplateRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("cover_letter_templates").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("CoverLetterTemplateRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("cover_letter_templates")
        .insert({ ...toRow(input), created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data)
        throwDataSourceError("CoverLetterTemplateRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("cover_letter_templates")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("CoverLetterTemplateRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("cover_letter_templates").delete().eq("id", id);
      if (error) throwDataSourceError("CoverLetterTemplateRepository.remove", error);
      return true;
    },
  };
}
