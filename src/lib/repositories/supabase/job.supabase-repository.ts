import type { Job, JobInput, JobSearchFilter, JobSearchResult } from "@/types";
import type { JobRepository } from "../job-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    companyName: String(row.company_name ?? ""),
    businessRegistrationNumber: (row.business_registration_number as string | null) ?? undefined,
    industryName: (row.industry_name as string | null) ?? undefined,
    jobCategory: String(row.job_category ?? "other"),
    occupationCode: (row.occupation_code as string | null) ?? undefined,
    occupationName: (row.occupation_name as string | null) ?? undefined,
    employmentDestinationId: (row.employment_destination_id as string | null) ?? undefined,
    region: (row.region as Job["region"]) ?? "seoul",
    regionSigungu: (row.region_sigungu as string | null) ?? undefined,
    locationDetail: (row.location_detail as string | null) ?? undefined,
    address: (row.address as string | null) ?? undefined,
    zipCode: (row.zip_code as string | null) ?? undefined,
    workType: (row.work_type as Job["workType"]) ?? "full_time",
    employmentTypeCode: (row.employment_type_code as string | null) ?? undefined,
    salaryType: (row.salary_type as Job["salaryType"]) ?? undefined,
    salaryMin: row.salary_min !== null && row.salary_min !== undefined ? Number(row.salary_min) : undefined,
    salaryMax: row.salary_max !== null && row.salary_max !== undefined ? Number(row.salary_max) : undefined,
    salaryText: (row.salary_text as string | null) ?? undefined,
    isBeginnerFriendly: Boolean(row.is_beginner_friendly),
    careerRequirement: (row.career_requirement as Job["careerRequirement"]) ?? undefined,
    educationRequirement: (row.education_requirement as string | null) ?? undefined,
    recommendedAgeGroups: (row.recommended_age_groups as Job["recommendedAgeGroups"]) ?? undefined,
    preferentialCodes: (row.preferential_codes as string[]) ?? [],
    workHours: (row.work_hours as string | null) ?? undefined,
    workDays: (row.work_days as string | null) ?? undefined,
    preferredQualifications: (row.preferred_qualifications as string[]) ?? [],
    qualificationRequirements: (row.qualification_requirements as string | null) ?? undefined,
    tags: (row.tags as Job["tags"]) ?? [],
    description: String(row.description ?? ""),
    requirements: (row.requirements as string | null) ?? undefined,
    benefits: (row.benefits as string | null) ?? undefined,
    midlifeRecommendationScore:
      row.midlife_recommendation_score !== null && row.midlife_recommendation_score !== undefined
        ? Number(row.midlife_recommendation_score)
        : undefined,
    postedAt: (row.posted_at as string | null) ?? undefined,
    applyDeadline: (row.apply_deadline as string | null) ?? undefined,
    status: (row.status as Job["status"]) ?? "draft",
    isActive: row.is_active !== false,
    closedAt: (row.closed_at as string | null) ?? undefined,
    source: (row.source as Job["source"]) ?? undefined,
    sourceUrl: (row.apply_url as string | null) ?? undefined,
    mobileSourceUrl: (row.mobile_source_url as string | null) ?? undefined,
    externalSource: (row.external_source as string | null) ?? undefined,
    externalId: (row.external_id as string | null) ?? undefined,
    rawPayload: (row.raw_payload as Record<string, unknown> | null) ?? undefined,
    fetchedAt: (row.fetched_at as string | null) ?? undefined,
    sourceUpdatedAt: (row.source_updated_at as string | null) ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<JobInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.companyName !== undefined) row.company_name = input.companyName;
  if (input.businessRegistrationNumber !== undefined) row.business_registration_number = input.businessRegistrationNumber;
  if (input.industryName !== undefined) row.industry_name = input.industryName;
  if (input.jobCategory !== undefined) row.job_category = input.jobCategory;
  if (input.occupationCode !== undefined) row.occupation_code = input.occupationCode;
  if (input.occupationName !== undefined) row.occupation_name = input.occupationName;
  if (input.employmentDestinationId !== undefined) row.employment_destination_id = input.employmentDestinationId;
  if (input.region !== undefined) row.region = input.region;
  if (input.regionSigungu !== undefined) row.region_sigungu = input.regionSigungu;
  if (input.locationDetail !== undefined) row.location_detail = input.locationDetail;
  if (input.address !== undefined) row.address = input.address;
  if (input.zipCode !== undefined) row.zip_code = input.zipCode;
  if (input.workType !== undefined) row.work_type = input.workType;
  if (input.employmentTypeCode !== undefined) row.employment_type_code = input.employmentTypeCode;
  if (input.salaryType !== undefined) row.salary_type = input.salaryType;
  if (input.salaryMin !== undefined) row.salary_min = input.salaryMin;
  if (input.salaryMax !== undefined) row.salary_max = input.salaryMax;
  if (input.salaryText !== undefined) row.salary_text = input.salaryText;
  if (input.isBeginnerFriendly !== undefined) row.is_beginner_friendly = input.isBeginnerFriendly;
  if (input.careerRequirement !== undefined) row.career_requirement = input.careerRequirement;
  if (input.educationRequirement !== undefined) row.education_requirement = input.educationRequirement;
  if (input.recommendedAgeGroups !== undefined) row.recommended_age_groups = input.recommendedAgeGroups;
  if (input.preferentialCodes !== undefined) row.preferential_codes = input.preferentialCodes;
  if (input.workHours !== undefined) row.work_hours = input.workHours;
  if (input.workDays !== undefined) row.work_days = input.workDays;
  if (input.preferredQualifications !== undefined) row.preferred_qualifications = input.preferredQualifications;
  if (input.qualificationRequirements !== undefined) row.qualification_requirements = input.qualificationRequirements;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.description !== undefined) row.description = input.description;
  if (input.requirements !== undefined) row.requirements = input.requirements;
  if (input.benefits !== undefined) row.benefits = input.benefits;
  if (input.midlifeRecommendationScore !== undefined) row.midlife_recommendation_score = input.midlifeRecommendationScore;
  if (input.postedAt !== undefined) row.posted_at = input.postedAt;
  if (input.applyDeadline !== undefined) row.apply_deadline = input.applyDeadline;
  if (input.status !== undefined) row.status = input.status;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  if (input.closedAt !== undefined) row.closed_at = input.closedAt;
  if (input.source !== undefined) row.source = input.source;
  if (input.sourceUrl !== undefined) row.apply_url = input.sourceUrl;
  if (input.mobileSourceUrl !== undefined) row.mobile_source_url = input.mobileSourceUrl;
  if (input.externalSource !== undefined) row.external_source = input.externalSource;
  if (input.externalId !== undefined) row.external_id = input.externalId;
  if (input.rawPayload !== undefined) row.raw_payload = input.rawPayload;
  if (input.fetchedAt !== undefined) row.fetched_at = input.fetchedAt;
  if (input.sourceUpdatedAt !== undefined) row.source_updated_at = input.sourceUpdatedAt;
  return row;
}

// Supabase-js의 PostgrestFilterBuilder 제네릭 체이닝 타입은 매우 장황하므로,
// 필터 적용 헬퍼는 any로 받고 호출부에서 반환 타입을 다시 좁혀서 사용한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySearchFilters(query: any, filter: JobSearchFilter) {
  let q = query;
  if (filter.activeOnly !== false) {
    q = q.eq("is_active", true).eq("status", "published");
  }
  if (filter.jobCategory) q = q.eq("job_category", filter.jobCategory);
  if (filter.occupationCode) q = q.eq("occupation_code", filter.occupationCode);
  if (filter.employmentDestinationId) q = q.eq("employment_destination_id", filter.employmentDestinationId);
  if (filter.region) q = q.eq("region", filter.region);
  if (filter.regionSigungu) q = q.eq("region_sigungu", filter.regionSigungu);
  if (filter.workType) q = q.eq("work_type", filter.workType);
  if (filter.employmentTypeCode) q = q.eq("employment_type_code", filter.employmentTypeCode);
  if (filter.careerRequirement) q = q.eq("career_requirement", filter.careerRequirement);
  if (filter.isBeginnerFriendly !== undefined) q = q.eq("is_beginner_friendly", filter.isBeginnerFriendly);
  if (filter.salaryMin !== undefined) q = q.gte("salary_max", filter.salaryMin);
  if (filter.salaryMax !== undefined) q = q.lte("salary_min", filter.salaryMax);
  if (filter.closingWithinDays !== undefined) {
    const until = new Date(Date.now() + filter.closingWithinDays * 24 * 60 * 60 * 1000).toISOString();
    q = q.not("apply_deadline", "is", null).gte("apply_deadline", new Date().toISOString()).lte("apply_deadline", until);
  }
  if (filter.preferentialCodes && filter.preferentialCodes.length > 0) {
    q = q.overlaps("preferential_codes", filter.preferentialCodes);
  }
  if (filter.tags && filter.tags.length > 0) {
    q = q.overlaps("tags", filter.tags);
  }
  if (filter.keyword) {
    const kw = filter.keyword.trim();
    if (kw) q = q.or(`title.ilike.%${kw}%,company_name.ilike.%${kw}%,description.ilike.%${kw}%`);
  }
  return q;
}

export function createSupabaseJobRepository(): JobRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      // PostgREST는 요청당 최대 1000행만 반환하므로, 전량 수집(6만+건) 이후에는
      // range 페이지네이션으로 전부 모아야 시장 통계/매칭이 부분 데이터로 계산되지 않는다.
      const PAGE = 1000;
      const all: Record<string, unknown>[] = [];
      for (let offset = 0; ; offset += PAGE) {
        let query = client.from("jobs").select("*").order("created_at", { ascending: false });
        if (filter) query = applySearchFilters(query, { ...filter, activeOnly: filter.activeOnly ?? false });
        const result = await query.range(offset, offset + PAGE - 1);
        const rows = unwrapList("JobRepository.findAll", result);
        all.push(...(rows as Record<string, unknown>[]));
        if (rows.length < PAGE) break;
      }
      return all.map((row) => mapRow(row));
    },
    async findById(id) {
      const result = await client.from("jobs").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("JobRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("jobs")
        .insert({ ...toRow(input), title: input.title, company_name: input.companyName, created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("JobRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("jobs")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("JobRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("jobs").delete().eq("id", id);
      if (error) throwDataSourceError("JobRepository.remove", error);
      return true;
    },
    async search(filter) {
      const page = Math.max(1, filter.page ?? 1);
      // 큐레이션 후보군(250)·관리자 목록(500) 같은 서버 내부 대량 조회를 허용하기 위해 상한 500.
      const pageSize = Math.min(500, Math.max(1, filter.pageSize ?? 20));
      const start = (page - 1) * pageSize;

      let query = client.from("jobs").select("*", { count: "exact" });
      query = applySearchFilters(query, filter);

      switch (filter.sort) {
        case "deadline":
          query = query.order("apply_deadline", { ascending: true, nullsFirst: false });
          break;
        case "salary_desc":
          query = query.order("salary_max", { ascending: false, nullsFirst: false });
          break;
        case "latest":
          query = query.order("posted_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
          break;
        case "recommended":
        default:
          query = query.order("midlife_recommendation_score", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
          break;
      }
      query = query.range(start, start + pageSize - 1);

      const result = await query;
      if (result.error) throwDataSourceError("JobRepository.search", result.error);
      const rows = (result.data ?? []) as Record<string, unknown>[];
      return {
        items: rows.map((row) => mapRow(row)),
        total: result.count ?? rows.length,
        page,
        pageSize,
      } satisfies JobSearchResult;
    },
    async findByExternalId(externalSource, externalId) {
      const result = await client
        .from("jobs")
        .select("*")
        .eq("external_source", externalSource)
        .eq("external_id", externalId)
        .maybeSingle();
      const row = unwrapMaybe("JobRepository.findByExternalId", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async upsertExternal(input) {
      const existingResult = await client
        .from("jobs")
        .select("id")
        .eq("external_source", input.externalSource)
        .eq("external_id", input.externalId)
        .maybeSingle();
      const existingRow = unwrapMaybe("JobRepository.upsertExternal.find", existingResult);

      const now = new Date().toISOString();
      if (existingRow) {
        const result = await client
          .from("jobs")
          .update({ ...toRow(input), updated_at: now })
          .eq("id", existingRow.id as string)
          .select("*")
          .single();
        if (result.error || !result.data) {
          throwDataSourceError("JobRepository.upsertExternal.update", result.error ?? new Error("no data returned"));
        }
        return { job: mapRow(result.data as Record<string, unknown>), isNew: false };
      }

      const { data, error } = await client
        .from("jobs")
        .insert({ ...toRow(input), title: input.title, company_name: input.companyName, created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("JobRepository.upsertExternal.insert", error ?? new Error("no data returned"));
      return { job: mapRow(data as Record<string, unknown>), isNew: true };
    },
    async upsertExternalMany(inputs) {
      if (inputs.length === 0) return { newCount: 0, updatedCount: 0, errorCount: 0 };

      const externalSource = inputs[0].externalSource;
      const externalIds = inputs.map((i) => i.externalId);
      const existingResult = await client
        .from("jobs")
        .select("external_id")
        .eq("external_source", externalSource)
        .in("external_id", externalIds);
      const existingIds = new Set(
        (unwrapList("JobRepository.upsertExternalMany.find", existingResult) as { external_id: string }[]).map(
          (r) => r.external_id,
        ),
      );

      const now = new Date().toISOString();
      // created_at은 DB default(now())에 맡긴다 - payload에 넣으면 upsert 갱신 시 기존 값이 덮인다.
      const rows = inputs.map((input) => ({
        ...toRow(input),
        title: input.title,
        company_name: input.companyName,
        updated_at: now,
      }));

      const { error } = await client.from("jobs").upsert(rows, { onConflict: "external_source,external_id" });
      if (!error) {
        const newCount = inputs.filter((i) => !existingIds.has(i.externalId)).length;
        return { newCount, updatedCount: inputs.length - newCount, errorCount: 0 };
      }

      // 배치 실패 시 건별 폴백 - 한 건의 매핑 오류가 페이지 전체를 잃게 하지 않는다.
      let newCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      for (const input of inputs) {
        try {
          const { isNew } = await this.upsertExternal(input);
          if (isNew) newCount += 1;
          else updatedCount += 1;
        } catch {
          errorCount += 1;
        }
      }
      return { newCount, updatedCount, errorCount };
    },
    async deactivateStale(externalSource, fetchedBefore) {
      const { data, error } = await client
        .from("jobs")
        .update({ is_active: false, closed_at: new Date().toISOString() })
        .eq("external_source", externalSource)
        .eq("is_active", true)
        .lt("fetched_at", fetchedBefore)
        .select("id");
      if (error) throwDataSourceError("JobRepository.deactivateStale", error);
      return (data ?? []).length;
    },
  };
}
