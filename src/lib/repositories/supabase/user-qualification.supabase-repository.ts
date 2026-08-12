import type { UserQualificationRecord, UserQualificationRepository } from "../user-qualification-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

export function createSupabaseUserQualificationRepository(): UserQualificationRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findByUserId(userId) {
      const result = await client
        .from("user_qualifications")
        .select("id, user_id, qualification_id, source, acquired_at, expires_at, qualifications(name)")
        .eq("user_id", userId);
      const rows = unwrapList("UserQualificationRepository.findByUserId", result);
      return rows.map((row) => {
        const r = row as Record<string, unknown>;
        const qual = r.qualifications as { name?: string } | { name?: string }[] | null;
        const name = Array.isArray(qual) ? qual[0]?.name : qual?.name;
        return {
          id: String(r.id),
          userId: String(r.user_id),
          qualificationId: String(r.qualification_id),
          name: name ?? "",
          source: String(r.source ?? "MANUAL"),
          acquiredAt: (r.acquired_at as string | null) ?? undefined,
          expiresAt: (r.expires_at as string | null) ?? undefined,
        } satisfies UserQualificationRecord;
      });
    },
    async upsertFromResume({ userId, name, acquiredAt, expiresAt, sourceResumeId }) {
      const trimmedName = name.trim();
      const existingQual = await client.from("qualifications").select("id, name").eq("name", trimmedName).maybeSingle();
      const existingQualRow = unwrapMaybe("UserQualificationRepository.upsertFromResume.findQualification", existingQual);

      let qualificationId: string;
      if (existingQualRow) {
        qualificationId = String((existingQualRow as Record<string, unknown>).id);
      } else {
        const { data: newQual, error: newQualError } = await client
          .from("qualifications")
          .insert({ name: trimmedName, type: "resume_added", status: "active" })
          .select("id")
          .single();
        if (newQualError || !newQual)
          throwDataSourceError("UserQualificationRepository.upsertFromResume.createQualification", newQualError ?? new Error("no data"));
        qualificationId = String((newQual as Record<string, unknown>).id);
      }

      const { data, error } = await client
        .from("user_qualifications")
        .upsert(
          {
            user_id: userId,
            qualification_id: qualificationId,
            status: "held",
            acquired_at: acquiredAt ?? null,
            expires_at: expiresAt ?? null,
            source: "RESUME",
            source_resume_id: sourceResumeId,
          },
          { onConflict: "user_id,qualification_id" },
        )
        .select("id, user_id, qualification_id, source, acquired_at, expires_at")
        .single();
      if (error || !data) throwDataSourceError("UserQualificationRepository.upsertFromResume.upsert", error ?? new Error("no data"));

      const row = data as Record<string, unknown>;
      return {
        id: String(row.id),
        userId: String(row.user_id),
        qualificationId: String(row.qualification_id),
        name: trimmedName,
        source: String(row.source ?? "RESUME"),
        acquiredAt: (row.acquired_at as string | null) ?? undefined,
        expiresAt: (row.expires_at as string | null) ?? undefined,
      };
    },
  };
}
