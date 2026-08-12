import type { SupportProgram, SupportProgramInput, SupportSearchFilter, SupportSearchResult } from "@/types";
import type { SupportProgramRepository } from "../support-program-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): SupportProgram {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    organization: String(row.organization ?? row.organization_name ?? ""),
    summary: String(row.summary ?? ""),
    description: String(row.description ?? ""),
    category: (row.category as SupportProgram["category"]) ?? "other",
    supportType: (row.support_type as SupportProgram["supportType"]) ?? "other",
    targetDescription: (row.target_description as string | null) ?? undefined,
    targetConditions: (row.target_conditions as string[]) ?? [],
    targetAgeGroups: (row.target_age_groups as SupportProgram["targetAgeGroups"]) ?? [],
    targetAgeMin: row.target_age_min !== null && row.target_age_min !== undefined ? Number(row.target_age_min) : undefined,
    targetAgeMax: row.target_age_max !== null && row.target_age_max !== undefined ? Number(row.target_age_max) : undefined,
    targetRegions: (row.target_regions as SupportProgram["targetRegions"]) ?? undefined,
    regionScope: (row.region_scope as string | null) ?? undefined,
    employmentStatusTargets: (row.employment_status_targets as SupportProgram["employmentStatusTargets"]) ?? [],
    incomeCondition: (row.income_condition as string | null) ?? undefined,
    careerCondition: (row.career_condition as string | null) ?? undefined,
    householdCondition: (row.household_condition as string | null) ?? undefined,
    educationCondition: (row.education_condition as string | null) ?? undefined,
    jobCondition: (row.job_condition as string | null) ?? undefined,
    eligibilityRaw: (row.eligibility_raw as string | null) ?? undefined,
    benefitDescription: (row.benefit_description as string | null) ?? undefined,
    supportAmountText: (row.support_amount_text as string | null) ?? undefined,
    applicationPeriod: (row.application_period as string | null) ?? undefined,
    applicationStartAt: (row.application_start_at as string | null) ?? undefined,
    applicationEndAt: (row.application_end_at as string | null) ?? undefined,
    applicationMethod: (row.application_method as string | null) ?? undefined,
    requiredDocuments: (row.required_documents as string[]) ?? [],
    organizationName: (row.organization_name as string | null) ?? undefined,
    departmentName: (row.department_name as string | null) ?? undefined,
    contact: (row.contact as string | null) ?? undefined,
    tags: (row.tags as SupportProgram["tags"]) ?? [],
    relatedJobCategories: (row.related_job_categories as string[]) ?? [],
    relatedQualificationCodes: (row.related_qualification_codes as string[]) ?? [],
    applyStartAt: (row.application_start_at as string | null) ?? undefined,
    applyEndAt: (row.application_end_at as string | null) ?? undefined,
    applyUrl: (row.apply_url as string | null) ?? undefined,
    sourceUrl: (row.source_url as string | null) ?? undefined,
    status: (row.status as SupportProgram["status"]) ?? "draft",
    isActive: row.is_active !== false,
    closedAt: (row.closed_at as string | null) ?? undefined,
    externalSource: (row.external_source as string | null) ?? undefined,
    externalId: (row.external_id as string | null) ?? undefined,
    rawPayload: (row.raw_payload as Record<string, unknown> | null) ?? undefined,
    fetchedAt: (row.fetched_at as string | null) ?? undefined,
    careerRelevanceScore: row.career_relevance_score !== null && row.career_relevance_score !== undefined ? Number(row.career_relevance_score) : 0,
    careerRelevanceReasons: (row.career_relevance_reasons as string[]) ?? [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<SupportProgramInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.organization !== undefined) row.organization = input.organization;
  if (input.summary !== undefined) row.summary = input.summary;
  if (input.description !== undefined) row.description = input.description;
  if (input.category !== undefined) row.category = input.category;
  if (input.supportType !== undefined) row.support_type = input.supportType;
  if (input.targetDescription !== undefined) row.target_description = input.targetDescription;
  if (input.targetConditions !== undefined) row.target_conditions = input.targetConditions;
  if (input.targetAgeGroups !== undefined) row.target_age_groups = input.targetAgeGroups;
  if (input.targetAgeMin !== undefined) row.target_age_min = input.targetAgeMin;
  if (input.targetAgeMax !== undefined) row.target_age_max = input.targetAgeMax;
  if (input.targetRegions !== undefined) row.target_regions = input.targetRegions;
  if (input.regionScope !== undefined) row.region_scope = input.regionScope;
  if (input.employmentStatusTargets !== undefined) row.employment_status_targets = input.employmentStatusTargets;
  if (input.incomeCondition !== undefined) row.income_condition = input.incomeCondition;
  if (input.careerCondition !== undefined) row.career_condition = input.careerCondition;
  if (input.householdCondition !== undefined) row.household_condition = input.householdCondition;
  if (input.educationCondition !== undefined) row.education_condition = input.educationCondition;
  if (input.jobCondition !== undefined) row.job_condition = input.jobCondition;
  if (input.eligibilityRaw !== undefined) row.eligibility_raw = input.eligibilityRaw;
  if (input.benefitDescription !== undefined) row.benefit_description = input.benefitDescription;
  if (input.supportAmountText !== undefined) row.support_amount_text = input.supportAmountText;
  if (input.applicationPeriod !== undefined) row.application_period = input.applicationPeriod;
  if (input.applicationStartAt !== undefined) row.application_start_at = input.applicationStartAt;
  if (input.applicationEndAt !== undefined) row.application_end_at = input.applicationEndAt;
  if (input.applicationMethod !== undefined) row.application_method = input.applicationMethod;
  if (input.requiredDocuments !== undefined) row.required_documents = input.requiredDocuments;
  if (input.organizationName !== undefined) row.organization_name = input.organizationName;
  if (input.departmentName !== undefined) row.department_name = input.departmentName;
  if (input.contact !== undefined) row.contact = input.contact;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.relatedJobCategories !== undefined) row.related_job_categories = input.relatedJobCategories;
  if (input.relatedQualificationCodes !== undefined) row.related_qualification_codes = input.relatedQualificationCodes;
  if (input.applyUrl !== undefined) row.apply_url = input.applyUrl;
  if (input.sourceUrl !== undefined) row.source_url = input.sourceUrl;
  if (input.status !== undefined) row.status = input.status;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  if (input.closedAt !== undefined) row.closed_at = input.closedAt;
  if (input.externalSource !== undefined) row.external_source = input.externalSource;
  if (input.externalId !== undefined) row.external_id = input.externalId;
  if (input.rawPayload !== undefined) row.raw_payload = input.rawPayload;
  if (input.fetchedAt !== undefined) row.fetched_at = input.fetchedAt;
  if (input.careerRelevanceScore !== undefined) row.career_relevance_score = input.careerRelevanceScore;
  if (input.careerRelevanceReasons !== undefined) row.career_relevance_reasons = input.careerRelevanceReasons;
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySearchFilters(query: any, filter: SupportSearchFilter) {
  let q = query;
  if (filter.activeOnly !== false) {
    q = q.eq("is_active", true).eq("status", "published");
  }
  if (filter.minCareerRelevanceScore !== undefined) q = q.gte("career_relevance_score", filter.minCareerRelevanceScore);
  if (filter.category) q = q.eq("category", filter.category);
  if (filter.regionScope) q = q.eq("region_scope", filter.regionScope);
  else if (filter.region) q = q.or(`region_scope.eq.${filter.region},region_scope.eq.national`);
  if (filter.provider) q = q.eq("external_source", filter.provider);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.tags && filter.tags.length > 0) q = q.overlaps("tags", filter.tags);
  if (filter.keyword) {
    const kw = filter.keyword.trim();
    if (kw) q = q.or(`title.ilike.%${kw}%,organization.ilike.%${kw}%,summary.ilike.%${kw}%`);
  }
  return q;
}

export function createSupabaseSupportProgramRepository(): SupportProgramRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      let query = client.from("support_programs").select("*").order("created_at", { ascending: false });
      if (filter) query = applySearchFilters(query, { ...filter, activeOnly: filter.activeOnly ?? false });
      const result = await query;
      const rows = unwrapList("SupportProgramRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("support_programs").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("SupportProgramRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("support_programs")
        .insert({ ...toRow(input), title: input.title, organization: input.organization, created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("SupportProgramRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("support_programs")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("SupportProgramRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("support_programs").delete().eq("id", id);
      if (error) throwDataSourceError("SupportProgramRepository.remove", error);
      return true;
    },
    async search(filter) {
      const page = Math.max(1, filter.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
      const start = (page - 1) * pageSize;

      let query = client.from("support_programs").select("*", { count: "exact" });
      query = applySearchFilters(query, filter);

      switch (filter.sort) {
        case "deadline":
          query = query.order("application_end_at", { ascending: true, nullsFirst: false });
          break;
        case "latest":
          query = query.order("created_at", { ascending: false });
          break;
        case "recommended":
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }
      query = query.range(start, start + pageSize - 1);

      const result = await query;
      if (result.error) throwDataSourceError("SupportProgramRepository.search", result.error);
      const rows = (result.data ?? []) as Record<string, unknown>[];
      return {
        items: rows.map((row) => mapRow(row)),
        total: result.count ?? rows.length,
        page,
        pageSize,
      } satisfies SupportSearchResult;
    },
    async findByExternalId(externalSource, externalId) {
      const result = await client
        .from("support_programs")
        .select("*")
        .eq("external_source", externalSource)
        .eq("external_id", externalId)
        .maybeSingle();
      const row = unwrapMaybe("SupportProgramRepository.findByExternalId", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async upsertExternal(input) {
      const existingResult = await client
        .from("support_programs")
        .select("id")
        .eq("external_source", input.externalSource)
        .eq("external_id", input.externalId)
        .maybeSingle();
      const existingRow = unwrapMaybe("SupportProgramRepository.upsertExternal.find", existingResult);

      const now = new Date().toISOString();
      if (existingRow) {
        const result = await client
          .from("support_programs")
          .update({ ...toRow(input), updated_at: now })
          .eq("id", existingRow.id as string)
          .select("*")
          .single();
        if (result.error || !result.data) {
          throwDataSourceError("SupportProgramRepository.upsertExternal.update", result.error ?? new Error("no data returned"));
        }
        return { program: mapRow(result.data as Record<string, unknown>), isNew: false };
      }

      const { data, error } = await client
        .from("support_programs")
        .insert({ ...toRow(input), title: input.title, organization: input.organization, created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("SupportProgramRepository.upsertExternal.insert", error ?? new Error("no data returned"));
      return { program: mapRow(data as Record<string, unknown>), isNew: true };
    },
    async deactivateStale(externalSource, fetchedBefore) {
      const { data, error } = await client
        .from("support_programs")
        .update({ is_active: false, closed_at: new Date().toISOString() })
        .eq("external_source", externalSource)
        .eq("is_active", true)
        .lt("fetched_at", fetchedBefore)
        .select("id");
      if (error) throwDataSourceError("SupportProgramRepository.deactivateStale", error);
      return (data ?? []).length;
    },
  };
}
