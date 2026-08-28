import type { CoverLetter, CoverLetterInput } from "@/types";
import type { CoverLetterRepository } from "../cover-letter-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): CoverLetter {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    resumeId: (row.resume_id as string | null) ?? undefined,
    targetJobId: (row.target_job_id as string | null) ?? undefined,
    targetOccupationId: (row.target_occupation_id as string | null) ?? undefined,
    title: String(row.title),
    templateId: (row.template_id as string | null) ?? undefined,
    experienceBankIds: Array.isArray(row.experience_bank_ids) ? (row.experience_bank_ids as string[]) : [],
    status: (row.status as CoverLetter["status"]) ?? "draft",
    version: Number(row.version ?? 1),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<CoverLetterInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.resumeId !== undefined) row.resume_id = input.resumeId;
  if (input.targetJobId !== undefined) row.target_job_id = input.targetJobId;
  if (input.targetOccupationId !== undefined) row.target_occupation_id = input.targetOccupationId;
  if (input.templateId !== undefined) row.template_id = input.templateId;
  if (input.experienceBankIds !== undefined) row.experience_bank_ids = input.experienceBankIds;
  if (input.status !== undefined) row.status = input.status;
  if (input.version !== undefined) row.version = input.version;
  return row;
}

export function createSupabaseCoverLetterRepository(): CoverLetterRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      let query = client.from("cover_letters").select("*").order("updated_at", { ascending: false });
      if (filter?.userId) query = query.eq("user_id", filter.userId);
      const result = await query;
      const rows = unwrapList("CoverLetterRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("cover_letters").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("CoverLetterRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("cover_letters")
        .insert({ user_id: input.userId, ...toRow(input), created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("CoverLetterRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("cover_letters")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("CoverLetterRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("cover_letters").delete().eq("id", id);
      if (error) throwDataSourceError("CoverLetterRepository.remove", error);
      return true;
    },
  };
}
