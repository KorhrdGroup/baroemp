import type { JobBookmark } from "@/types";
import type { JobBookmarkRepository } from "../job-bookmark-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): JobBookmark {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    jobId: String(row.job_id),
    createdAt: String(row.created_at),
  };
}

export function createSupabaseJobBookmarkRepository(): JobBookmarkRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAllByUser(userId) {
      const result = await client
        .from("job_bookmarks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const rows = unwrapList("JobBookmarkRepository.findAllByUser", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async isBookmarked(userId, jobId) {
      const result = await client
        .from("job_bookmarks")
        .select("id")
        .eq("user_id", userId)
        .eq("job_id", jobId)
        .maybeSingle();
      const row = unwrapMaybe("JobBookmarkRepository.isBookmarked", result);
      return Boolean(row);
    },
    async add(userId, jobId) {
      const existingResult = await client
        .from("job_bookmarks")
        .select("*")
        .eq("user_id", userId)
        .eq("job_id", jobId)
        .maybeSingle();
      const existingRow = unwrapMaybe("JobBookmarkRepository.add.find", existingResult);
      if (existingRow) return mapRow(existingRow as Record<string, unknown>);

      const { data, error } = await client
        .from("job_bookmarks")
        .insert({ user_id: userId, job_id: jobId, created_at: new Date().toISOString() })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("JobBookmarkRepository.add", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async remove(userId, jobId) {
      const { data, error } = await client
        .from("job_bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("job_id", jobId)
        .select("id");
      if (error) throwDataSourceError("JobBookmarkRepository.remove", error);
      return (data ?? []).length > 0;
    },
    async mergeJobIds(userId, jobIds) {
      if (jobIds.length === 0) return 0;
      const existingResult = await client.from("job_bookmarks").select("job_id").eq("user_id", userId);
      const existingRows = unwrapList("JobBookmarkRepository.mergeJobIds.find", existingResult);
      const existingIds = new Set(existingRows.map((row) => String((row as Record<string, unknown>).job_id)));
      const toInsert = jobIds.filter((id) => !existingIds.has(id));
      if (toInsert.length === 0) return 0;

      const now = new Date().toISOString();
      const { error } = await client
        .from("job_bookmarks")
        .insert(toInsert.map((jobId) => ({ user_id: userId, job_id: jobId, created_at: now })));
      if (error) throwDataSourceError("JobBookmarkRepository.mergeJobIds", error);
      return toInsert.length;
    },
  };
}
