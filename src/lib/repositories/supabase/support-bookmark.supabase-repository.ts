import type { SupportBookmark } from "@/types";
import type { SupportBookmarkRepository } from "../support-bookmark-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

function mapRow(row: Record<string, unknown>): SupportBookmark {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    supportProgramId: String(row.support_program_id),
    createdAt: String(row.created_at),
  };
}

export function createSupabaseSupportBookmarkRepository(): SupportBookmarkRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAllByUser(userId) {
      const result = await client
        .from("support_bookmarks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const rows = unwrapList("SupportBookmarkRepository.findAllByUser", result);
      return rows.map((row) => mapRow(row as Record<string, unknown>));
    },
    async isBookmarked(userId, supportProgramId) {
      const result = await client
        .from("support_bookmarks")
        .select("id")
        .eq("user_id", userId)
        .eq("support_program_id", supportProgramId)
        .maybeSingle();
      const row = unwrapMaybe("SupportBookmarkRepository.isBookmarked", result);
      return Boolean(row);
    },
    async add(userId, supportProgramId) {
      const existingResult = await client
        .from("support_bookmarks")
        .select("*")
        .eq("user_id", userId)
        .eq("support_program_id", supportProgramId)
        .maybeSingle();
      const existingRow = unwrapMaybe("SupportBookmarkRepository.add.find", existingResult);
      if (existingRow) return mapRow(existingRow as Record<string, unknown>);

      const { data, error } = await client
        .from("support_bookmarks")
        .insert({ user_id: userId, support_program_id: supportProgramId, created_at: new Date().toISOString() })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("SupportBookmarkRepository.add", error ?? new Error("no data returned"));
      return mapRow(data as Record<string, unknown>);
    },
    async remove(userId, supportProgramId) {
      const { data, error } = await client
        .from("support_bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("support_program_id", supportProgramId)
        .select("id");
      if (error) throwDataSourceError("SupportBookmarkRepository.remove", error);
      return (data ?? []).length > 0;
    },
    async mergeSupportIds(userId, supportProgramIds) {
      if (supportProgramIds.length === 0) return 0;
      const existingResult = await client.from("support_bookmarks").select("support_program_id").eq("user_id", userId);
      const existingRows = unwrapList("SupportBookmarkRepository.mergeSupportIds.find", existingResult);
      const existingIds = new Set(existingRows.map((row) => String((row as Record<string, unknown>).support_program_id)));
      const toInsert = supportProgramIds.filter((id) => !existingIds.has(id));
      if (toInsert.length === 0) return 0;

      const now = new Date().toISOString();
      const { error } = await client
        .from("support_bookmarks")
        .insert(toInsert.map((supportProgramId) => ({ user_id: userId, support_program_id: supportProgramId, created_at: now })));
      if (error) throwDataSourceError("SupportBookmarkRepository.mergeSupportIds", error);
      return toInsert.length;
    },
  };
}
