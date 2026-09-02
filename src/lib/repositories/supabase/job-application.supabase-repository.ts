import type { JobApplication } from "@/types";
import type { JobApplicationRepository } from "../job-application-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList } from "./query-helpers";

function mapRow(row: Record<string, unknown>): JobApplication {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    jobId: String(row.job_id),
    status: row.status as JobApplication["status"],
    reportedAt: String(row.reported_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function createSupabaseJobApplicationRepository(): JobApplicationRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAllByUser(userId) {
      const result = await client
        .from("job_applications")
        .select("*")
        .eq("user_id", userId)
        .order("reported_at", { ascending: false });
      const rows = unwrapList("JobApplicationRepository.findAllByUser", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async upsert(userId, jobId, status) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("job_applications")
        .upsert({ user_id: userId, job_id: jobId, status, reported_at: now }, { onConflict: "user_id,job_id" })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("JobApplicationRepository.upsert", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async remove(userId, jobId) {
      const { data, error } = await client
        .from("job_applications")
        .delete()
        .eq("user_id", userId)
        .eq("job_id", jobId)
        .select("id");
      if (error) throwDataSourceError("JobApplicationRepository.remove", error);
      return (data ?? []).length > 0;
    },
  };
}
