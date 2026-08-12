import type { ExperienceBankItem, ExperienceBankItemInput } from "@/types";
import type { ExperienceBankRepository } from "../experience-bank-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): ExperienceBankItem {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    situation: (row.situation as string | null) ?? undefined,
    task: (row.task as string | null) ?? undefined,
    action: (row.action as string | null) ?? undefined,
    result: (row.result as string | null) ?? undefined,
    skills: (row.skills as string[] | null) ?? [],
    relatedOccupations: (row.related_occupations as string[] | null) ?? [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(input: Partial<ExperienceBankItemInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.situation !== undefined) row.situation = input.situation;
  if (input.task !== undefined) row.task = input.task;
  if (input.action !== undefined) row.action = input.action;
  if (input.result !== undefined) row.result = input.result;
  if (input.skills !== undefined) row.skills = input.skills;
  if (input.relatedOccupations !== undefined) row.related_occupations = input.relatedOccupations;
  return row;
}

export function createSupabaseExperienceBankRepository(): ExperienceBankRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      let query = client.from("experience_bank").select("*").order("updated_at", { ascending: false });
      if (filter?.userId) query = query.eq("user_id", filter.userId);
      const result = await query;
      const rows = unwrapList("ExperienceBankRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("experience_bank").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("ExperienceBankRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      if (!input.userId) throw new Error("ExperienceBankRepository.create: userId is required");
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("experience_bank")
        .insert({ user_id: input.userId, ...toRow(input), created_at: now, updated_at: now })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("ExperienceBankRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client
        .from("experience_bank")
        .update({ ...toRow(input), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = unwrapMaybe("ExperienceBankRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("experience_bank").delete().eq("id", id);
      if (error) throwDataSourceError("ExperienceBankRepository.remove", error);
      return true;
    },
  };
}
