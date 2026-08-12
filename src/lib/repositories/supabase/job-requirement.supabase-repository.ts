import type { JobRequirement, JobRequirementInput } from "@/types";
import type { JobRequirementRepository } from "../job-requirement-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): JobRequirement {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    requirementId: String(row.requirement_id),
    requirementLevel: (row.requirement_level as JobRequirement["requirementLevel"]) ?? "MENTIONED",
    sourceText: (row.source_text as string | null) ?? undefined,
    confidence: Number(row.confidence ?? 1),
    createdAt: String(row.created_at),
  };
}

function toRow(input: Partial<JobRequirementInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.jobId !== undefined) row.job_id = input.jobId;
  if (input.requirementId !== undefined) row.requirement_id = input.requirementId;
  if (input.requirementLevel !== undefined) row.requirement_level = input.requirementLevel;
  if (input.sourceText !== undefined) row.source_text = input.sourceText;
  if (input.confidence !== undefined) row.confidence = input.confidence;
  return row;
}

const CHUNK_SIZE = 200;

export function createSupabaseJobRequirementRepository(): JobRequirementRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll(filter) {
      let query = client.from("job_requirements").select("*");
      if (filter?.jobId) query = query.eq("job_id", filter.jobId);
      if (filter?.requirementId) query = query.eq("requirement_id", filter.requirementId);
      const result = await query;
      const rows = unwrapList("JobRequirementRepository.findAll", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async findById(id) {
      const result = await client.from("job_requirements").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("JobRequirementRepository.findById", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async create(input) {
      const { data, error } = await client
        .from("job_requirements")
        .upsert({ ...toRow(input), created_at: new Date().toISOString() }, { onConflict: "job_id,requirement_id" })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("JobRequirementRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async update(id, input) {
      const result = await client.from("job_requirements").update(toRow(input)).eq("id", id).select("*").maybeSingle();
      const row = unwrapMaybe("JobRequirementRepository.update", result);
      return row ? mapRow(row as Record<string, unknown>) : null;
    },
    async remove(id) {
      const { error } = await client.from("job_requirements").delete().eq("id", id);
      if (error) throwDataSourceError("JobRequirementRepository.remove", error);
      return true;
    },
    async findByJobIds(jobIds) {
      if (jobIds.length === 0) return [];
      const chunks: string[][] = [];
      for (let i = 0; i < jobIds.length; i += CHUNK_SIZE) chunks.push(jobIds.slice(i, i + CHUNK_SIZE));
      const all: JobRequirement[] = [];
      for (const chunk of chunks) {
        const result = await client.from("job_requirements").select("*").in("job_id", chunk);
        const rows = unwrapList("JobRequirementRepository.findByJobIds", result);
        all.push(...rows.map((row) => mapRow(row as Record<string, unknown>)));
      }
      return all;
    },
    async replaceForJob(jobId, newItems) {
      const { error: deleteError } = await client.from("job_requirements").delete().eq("job_id", jobId);
      if (deleteError) throwDataSourceError("JobRequirementRepository.replaceForJob(delete)", deleteError);
      if (newItems.length === 0) return [];
      const rows = newItems.map((input) => ({ ...toRow(input), created_at: new Date().toISOString() }));
      const { data, error } = await client.from("job_requirements").insert(rows).select("*");
      if (error) throwDataSourceError("JobRequirementRepository.replaceForJob(insert)", error);
      return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
    },
  };
}
