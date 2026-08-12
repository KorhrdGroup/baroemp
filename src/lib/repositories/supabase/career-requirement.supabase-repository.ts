import type { CareerGapRequirement, CareerGapRequirementInput } from "@/types";
import type { CareerRequirementRepository } from "../career-requirement-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): CareerGapRequirement {
  return {
    id: String(row.id),
    key: String(row.key),
    name: String(row.name),
    category: (row.category as CareerGapRequirement["category"]) ?? "OTHER",
    description: (row.description as string | null) ?? undefined,
    matchingType: (row.matching_type as CareerGapRequirement["matchingType"]) ?? "SKILL_KEYWORD",
    relatedQualificationId: (row.related_qualification_id as string | null) ?? undefined,
    relatedSkillId: (row.related_skill_id as string | null) ?? undefined,
    relatedContentTags: (row.related_content_tags as string[] | null) ?? [],
    detectionKeywords: (row.detection_keywords as string[] | null) ?? [],
    preparationDifficulty: (row.preparation_difficulty as CareerGapRequirement["preparationDifficulty"]) ?? "MEDIUM",
    status: (row.status as CareerGapRequirement["status"]) ?? "active",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<CareerGapRequirementInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.key !== undefined) row.key = input.key;
  if (input.name !== undefined) row.name = input.name;
  if (input.category !== undefined) row.category = input.category;
  if (input.description !== undefined) row.description = input.description;
  if (input.matchingType !== undefined) row.matching_type = input.matchingType;
  if (input.relatedQualificationId !== undefined) row.related_qualification_id = input.relatedQualificationId;
  if (input.relatedSkillId !== undefined) row.related_skill_id = input.relatedSkillId;
  if (input.relatedContentTags !== undefined) row.related_content_tags = input.relatedContentTags;
  if (input.detectionKeywords !== undefined) row.detection_keywords = input.detectionKeywords;
  if (input.preparationDifficulty !== undefined) row.preparation_difficulty = input.preparationDifficulty;
  if (input.status !== undefined) row.status = input.status;
  return row;
}

export function createSupabaseCareerRequirementRepository(): CareerRequirementRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      let query = client.from("career_requirements").select("*").order("name", { ascending: true });
      if (filter?.category) query = query.eq("category", filter.category);
      if (filter?.status) query = query.eq("status", filter.status);
      const result = await query;
      const rows = unwrapList("CareerRequirementRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("career_requirements").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("CareerRequirementRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("career_requirements")
        .insert({ ...toRow(input), created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("CareerRequirementRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("career_requirements")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("CareerRequirementRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("career_requirements").delete().eq("id", id);
      if (error) throwDataSourceError("CareerRequirementRepository.remove", error);
      return true;
    },
  };
}
