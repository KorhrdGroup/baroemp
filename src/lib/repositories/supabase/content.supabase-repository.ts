import type { CareerContent, CareerContentInput } from "@/types";
import type { ContentFilter, ContentRepository } from "../content-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): CareerContent {
  return {
    id: String(row.id),
    title: String(row.title),
    type: row.type as CareerContent["type"],
    description: String(row.description ?? ""),
    summary: (row.short_description as string | undefined) ?? undefined,
    shortDescription: (row.short_description as string | undefined) ?? undefined,
    slug: (row.slug as string | undefined) ?? undefined,
    category: (row.category as string | undefined) ?? undefined,
    tags: [],
    relatedJobs: (row.related_jobs as string[]) ?? [],
    targetAgeGroups: (row.target_age_groups as CareerContent["targetAgeGroups"]) ?? [],
    targetConditions: (row.target_conditions as string[]) ?? [],
    requiredQualifications: (row.required_qualifications as string[]) ?? [],
    recommendationRules: (row.recommendation_rules as CareerContent["recommendationRules"]) ?? {},
    price: Number(row.price ?? 0),
    isPaid: Boolean(row.is_paid),
    status: row.status as CareerContent["status"],
    provider: (row.provider as string | undefined) ?? undefined,
    thumbnailUrl: (row.thumbnail_url as string | undefined) ?? undefined,
    metadata: (row.metadata as Record<string, unknown> | undefined) ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * Supabase contents 테이블 Repository.
 * Admin Service Role Client 사용 (관리자 CRUD).
 */
export function createSupabaseContentRepository(): ContentRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter?: ContentFilter) {
      let query = client.from("contents").select("*").order("updated_at", { ascending: false });
      if (filter?.type) query = query.eq("type", filter.type);
      if (filter?.status) query = query.eq("status", filter.status);
      if (filter?.keyword) query = query.ilike("title", `%${filter.keyword}%`);
      const result = await query;
      const rows = unwrapList("ContentRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id: string) {
      const result = await client.from("contents").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("ContentRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input: CareerContentInput) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("contents")
        .insert({
          title: input.title,
          type: input.type,
          description: input.description ?? "",
          short_description: input.summary ?? input.shortDescription ?? null,
          slug: input.slug ?? null,
          category: input.category ?? null,
          price: input.price ?? 0,
          is_paid: input.isPaid ?? false,
          status: input.status ?? "draft",
          related_jobs: input.relatedJobs ?? [],
          target_age_groups: input.targetAgeGroups ?? [],
          target_conditions: input.targetConditions ?? [],
          required_qualifications: input.requiredQualifications ?? [],
          recommendation_rules: input.recommendationRules ?? {},
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();
      if (error || !data) {
        throwDataSourceError("ContentRepository.create", error ?? new Error("no data returned"));
      }
      return mapRow(data as Record<string, unknown>);
    },
    async update(id: string, input: Partial<CareerContentInput>) {
      const result = await client
        .from("contents")
        .update({
          title: input.title,
          type: input.type,
          description: input.description,
          short_description: input.summary ?? input.shortDescription,
          slug: input.slug,
          category: input.category,
          price: input.price,
          is_paid: input.isPaid,
          status: input.status,
          related_jobs: input.relatedJobs,
          target_age_groups: input.targetAgeGroups,
          target_conditions: input.targetConditions,
          required_qualifications: input.requiredQualifications,
          recommendation_rules: input.recommendationRules,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("ContentRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id: string) {
      const { error } = await client.from("contents").delete().eq("id", id);
      if (error) throwDataSourceError("ContentRepository.remove", error);
      return true;
    },
  };
}
