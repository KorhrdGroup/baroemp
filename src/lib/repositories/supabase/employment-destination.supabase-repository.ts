import type { EmploymentDestination, EmploymentDestinationInput } from "@/types";
import type { EmploymentDestinationRepository } from "../employment-destination-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): EmploymentDestination {
  return {
    id: String(row.id),
    occupationId: String(row.occupation_id),
    name: String(row.name),
    slug: String(row.slug),
    description: (row.description as string | null) ?? undefined,
    category: (row.category as string | null) ?? undefined,
    tags: (row.tags as string[] | null) ?? [],
    classifierKeywords: (row.classifier_keywords as string[] | null) ?? [],
    status: (row.status as EmploymentDestination["status"]) ?? "active",
    orderIndex: Number(row.order_index ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<EmploymentDestinationInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.occupationId !== undefined) row.occupation_id = input.occupationId;
  if (input.name !== undefined) row.name = input.name;
  if (input.slug !== undefined) row.slug = input.slug;
  if (input.description !== undefined) row.description = input.description;
  if (input.category !== undefined) row.category = input.category;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.classifierKeywords !== undefined) row.classifier_keywords = input.classifierKeywords;
  if (input.status !== undefined) row.status = input.status;
  if (input.orderIndex !== undefined) row.order_index = input.orderIndex;
  return row;
}

export function createSupabaseEmploymentDestinationRepository(): EmploymentDestinationRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      let query = client.from("employment_destinations").select("*").order("order_index", { ascending: true });
      if (filter?.occupationId) query = query.eq("occupation_id", filter.occupationId);
      if (filter?.status) query = query.eq("status", filter.status);
      const result = await query;
      const rows = unwrapList("EmploymentDestinationRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("employment_destinations").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("EmploymentDestinationRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("employment_destinations")
        .insert({ ...toRow(input), created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("EmploymentDestinationRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("employment_destinations")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("EmploymentDestinationRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("employment_destinations").delete().eq("id", id);
      if (error) throwDataSourceError("EmploymentDestinationRepository.remove", error);
      return true;
    },
  };
}
