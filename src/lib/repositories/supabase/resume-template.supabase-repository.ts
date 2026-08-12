import type { ResumeTemplate, ResumeTemplateInput } from "@/types";
import type { ResumeTemplateRepository } from "../resume-template-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): ResumeTemplate {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    description: (row.description as string | null) ?? undefined,
    targetType: String(row.target_type ?? "general"),
    sections: (row.sections as ResumeTemplate["sections"] | null) ?? [],
    status: (row.status as ResumeTemplate["status"]) ?? "active",
    orderIndex: Number(row.order_index ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<ResumeTemplateInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.code !== undefined) row.code = input.code;
  if (input.name !== undefined) row.name = input.name;
  if (input.description !== undefined) row.description = input.description;
  if (input.targetType !== undefined) row.target_type = input.targetType;
  if (input.sections !== undefined) row.sections = input.sections;
  if (input.status !== undefined) row.status = input.status;
  if (input.orderIndex !== undefined) row.order_index = input.orderIndex;
  return row;
}

export function createSupabaseResumeTemplateRepository(): ResumeTemplateRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      let query = client.from("resume_templates").select("*").order("order_index", { ascending: true });
      if (filter?.status) query = query.eq("status", filter.status);
      const result = await query;
      const rows = unwrapList("ResumeTemplateRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("resume_templates").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("ResumeTemplateRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("resume_templates")
        .insert({ ...toRow(input), created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("ResumeTemplateRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("resume_templates")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("ResumeTemplateRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("resume_templates").delete().eq("id", id);
      if (error) throwDataSourceError("ResumeTemplateRepository.remove", error);
      return true;
    },
  };
}
