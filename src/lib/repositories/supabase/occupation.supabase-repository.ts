import type { Occupation, OccupationInput, OccupationMatchingRule } from "@/types";
import type { OccupationRepository } from "../occupation-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): Occupation {
  return {
    id: String(row.id),
    name: String(row.name),
    category: (row.category as string | null) ?? undefined,
    description: String(row.description ?? ""),
    isMidcareerFriendly: Boolean(row.is_midcareer_friendly),
    status: row.status as Occupation["status"],
    tags: (row.tags as Occupation["tags"]) ?? [],
    relatedContentIds: (row.related_content_ids as string[]) ?? [],
    requiredQualifications: (row.required_qualifications as string[]) ?? [],
    recommendedAgeGroups: (row.recommended_age_groups as Occupation["recommendedAgeGroups"]) ?? [],
    preferredEmploymentTypes: (row.preferred_employment_types as Occupation["preferredEmploymentTypes"]) ?? [],
    preferredRegions: (row.preferred_regions as Occupation["preferredRegions"]) ?? [],
    jobCategoryCode: (row.job_category_code as string | null) ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<OccupationInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.category !== undefined) row.category = input.category;
  if (input.description !== undefined) row.description = input.description;
  if (input.isMidcareerFriendly !== undefined) row.is_midcareer_friendly = input.isMidcareerFriendly;
  if (input.status !== undefined) row.status = input.status;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.relatedContentIds !== undefined) row.related_content_ids = input.relatedContentIds;
  if (input.requiredQualifications !== undefined) row.required_qualifications = input.requiredQualifications;
  if (input.recommendedAgeGroups !== undefined) row.recommended_age_groups = input.recommendedAgeGroups;
  if (input.preferredEmploymentTypes !== undefined) row.preferred_employment_types = input.preferredEmploymentTypes;
  if (input.preferredRegions !== undefined) row.preferred_regions = input.preferredRegions;
  if (input.jobCategoryCode !== undefined) row.job_category_code = input.jobCategoryCode;
  return row;
}

export function createSupabaseOccupationRepository(): OccupationRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll() {
      const result = await client.from("occupations").select("*").order("created_at", { ascending: false });
      const rows = unwrapList("OccupationRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("occupations").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("OccupationRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("occupations")
        .insert({ ...toRow(input), name: input.name, created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("OccupationRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("occupations")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("OccupationRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("occupations").delete().eq("id", id);
      if (error) throwDataSourceError("OccupationRepository.remove", error);
      return true;
    },
  };
}

function mapRuleRow(row: Record<string, unknown>): OccupationMatchingRule {
  return {
    id: String(row.id),
    occupationId: String(row.occupation_id),
    dimension: String(row.dimension),
    targetValue: Number(row.target_value),
    weight: Number(row.weight),
    isRequired: Boolean(row.is_required),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

/**
 * occupation_matching_rules는 별도 CRUD UI가 없는 V1 특성상 조회만 지원한다.
 * null을 반환하면 호출부(occupation-repository.ts)가 정책에 따라 Mock 폴백/에러를 결정한다.
 */
export async function fetchSupabaseOccupationMatchingRules(
  occupationId?: string,
): Promise<OccupationMatchingRule[] | null> {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  let query = client.from("occupation_matching_rules").select("*");
  if (occupationId) query = query.eq("occupation_id", occupationId);
  const result = await query;
  const rows = unwrapList("OccupationMatchingRules.fetch", result);
  return rows.map((row) => mapRuleRow(row as Record<string, unknown>));
}
