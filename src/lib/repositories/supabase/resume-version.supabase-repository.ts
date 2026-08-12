import type { ResumeVersion } from "@/types";
import type { ResumeVersionRepository } from "../resume-version-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList } from "./query-helpers";

function mapRow(row: Record<string, unknown>): ResumeVersion {
  return {
    id: String(row.id),
    resumeId: String(row.resume_id),
    version: Number(row.version),
    snapshot: row.snapshot as ResumeVersion["snapshot"],
    changeType: row.change_type as ResumeVersion["changeType"],
    createdAt: String(row.created_at),
  };
}

export function createSupabaseResumeVersionRepository(): ResumeVersionRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async listByResume(resumeId) {
      const result = await client
        .from("resume_versions")
        .select("*")
        .eq("resume_id", resumeId)
        .order("version", { ascending: false });
      const rows = unwrapList("ResumeVersionRepository.listByResume", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async create(input) {
      const { data, error } = await client
        .from("resume_versions")
        .insert({
          resume_id: input.resumeId,
          version: input.version,
          snapshot: input.snapshot,
          change_type: input.changeType,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("ResumeVersionRepository.create", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
  };
}
