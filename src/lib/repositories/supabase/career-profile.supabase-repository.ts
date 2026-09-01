import type { CareerProfile, CareerProfileInput } from "@/types";
import type { CareerProfileRepository } from "../career-profile-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): CareerProfile {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    ageGroup: (row.age_group as CareerProfile["ageGroup"]) ?? undefined,
    region: (row.preferred_region as CareerProfile["region"]) ?? undefined,
    educationLevel: (row.education_level as CareerProfile["educationLevel"]) ?? undefined,
    careerYears: row.career_years !== null && row.career_years !== undefined ? Number(row.career_years) : undefined,
    careerBreakMonths: (row.career_break_months as number | null) ?? undefined,
    employmentStatus: (row.employment_status as CareerProfile["employmentStatus"]) ?? undefined,
    desiredJobCategories: (row.desired_job_categories as string[] | null) ?? [],
    interestedJobIds: [],
    desiredSalaryMin: (row.desired_salary_min as number | null) ?? undefined,
    desiredSalaryMax: (row.desired_salary_max as number | null) ?? undefined,
    desiredWorkTypes: (row.desired_work_types as CareerProfile["desiredWorkTypes"]) ?? [],
    desiredStartTiming: (row.desired_start_timing as CareerProfile["desiredStartTiming"]) ?? undefined,
    canDrive: Boolean(row.can_drive),
    heldQualifications: [],
    interestedQualifications: [],
    isOpenToTraining: (row.education_willingness as boolean | null) ?? undefined,
    employmentBarriers: (row.employment_barriers as string[] | null) ?? [],
    // 예전 진단이 '#운전가능' 표기로 저장한 행이 남아 있으므로 읽을 때 접두사를 벗겨 통일한다.
    interestTags: ((row.interest_tags as string[] | null) ?? []).map((tag) => tag.replace(/^#/, "")),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<CareerProfileInput & { userId?: string }>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.ageGroup !== undefined) row.age_group = input.ageGroup;
  if (input.region !== undefined) row.preferred_region = input.region;
  if (input.educationLevel !== undefined) row.education_level = input.educationLevel;
  if (input.careerYears !== undefined) row.career_years = input.careerYears;
  if (input.careerBreakMonths !== undefined) row.career_break_months = input.careerBreakMonths;
  if (input.employmentStatus !== undefined) row.employment_status = input.employmentStatus;
  if (input.desiredJobCategories !== undefined) row.desired_job_categories = input.desiredJobCategories;
  if (input.desiredSalaryMin !== undefined) row.desired_salary_min = input.desiredSalaryMin;
  if (input.desiredSalaryMax !== undefined) row.desired_salary_max = input.desiredSalaryMax;
  if (input.desiredWorkTypes !== undefined) row.desired_work_types = input.desiredWorkTypes;
  if (input.desiredStartTiming !== undefined) row.desired_start_timing = input.desiredStartTiming;
  if (input.canDrive !== undefined) row.can_drive = input.canDrive;
  if (input.isOpenToTraining !== undefined) row.education_willingness = input.isOpenToTraining;
  if (input.employmentBarriers !== undefined) row.employment_barriers = input.employmentBarriers;
  if (input.interestTags !== undefined) row.interest_tags = input.interestTags;
  return row;
}

/**
 * career_profiles는 `user_id unique` 제약이 있는 1 User = 1 Career Profile 테이블이다.
 * heldQualifications/interestedQualifications/interestedJobIds는 STEP2의
 * user_qualifications/user_qualification_interests/user_job_interests 조인 테이블에
 * 별도로 저장되는 구조라, 이 Repository의 책임 범위(career_profiles 1행)에서는
 * 항상 빈 배열로 채워둔다. 실제 서비스에서 필요하면 해당 조인 테이블 Repository를 추가로 조회한다.
 */
export function createSupabaseCareerProfileRepository(): CareerProfileRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      let query = client.from("career_profiles").select("*");
      if (filter?.userId) query = query.eq("user_id", filter.userId);
      const result = await query;
      const rows = unwrapList("CareerProfileRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("career_profiles").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("CareerProfileRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      if (!input.userId) throw new Error("CareerProfileRepository.create: userId is required");
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("career_profiles")
        .insert({ user_id: input.userId, ...toRow(input), created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("CareerProfileRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("career_profiles")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("CareerProfileRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("career_profiles").delete().eq("id", id);
      if (error) throwDataSourceError("CareerProfileRepository.remove", error);
      return true;
    },
  };
}
