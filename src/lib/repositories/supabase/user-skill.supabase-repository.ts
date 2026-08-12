import type { UserSkillRecord, UserSkillRepository } from "../user-skill-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

export function createSupabaseUserSkillRepository(): UserSkillRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findByUserId(userId) {
      const result = await client.from("user_skills").select("id, user_id, skill_id, source, skills(name)").eq("user_id", userId);
      const rows = unwrapList("UserSkillRepository.findByUserId", result);
      return rows.map((row) => {
        const r = row as Record<string, unknown>;
        const skill = r.skills as { name?: string } | { name?: string }[] | null;
        const name = Array.isArray(skill) ? skill[0]?.name : skill?.name;
        return {
          id: String(r.id),
          userId: String(r.user_id),
          skillId: String(r.skill_id),
          name: name ?? "",
          source: String(r.source ?? "MANUAL"),
        } satisfies UserSkillRecord;
      });
    },
    async upsertFromResume({ userId, name, sourceResumeId }) {
      const trimmedName = name.trim();
      const existingSkill = await client.from("skills").select("id, name").eq("name", trimmedName).maybeSingle();
      const existingSkillRow = unwrapMaybe("UserSkillRepository.upsertFromResume.findSkill", existingSkill);

      let skillId: string;
      if (existingSkillRow) {
        skillId = String((existingSkillRow as Record<string, unknown>).id);
      } else {
        const { data: newSkill, error: newSkillError } = await client
          .from("skills")
          .insert({ name: trimmedName, status: "active" })
          .select("id")
          .single();
        if (newSkillError || !newSkill)
          throwDataSourceError("UserSkillRepository.upsertFromResume.createSkill", newSkillError ?? new Error("no data"));
        skillId = String((newSkill as Record<string, unknown>).id);
      }

      const { data, error } = await client
        .from("user_skills")
        .upsert(
          { user_id: userId, skill_id: skillId, source: "RESUME", source_resume_id: sourceResumeId },
          { onConflict: "user_id,skill_id" },
        )
        .select("id, user_id, skill_id, source")
        .single();
      if (error || !data) throwDataSourceError("UserSkillRepository.upsertFromResume.upsert", error ?? new Error("no data"));

      const row = data as Record<string, unknown>;
      return {
        id: String(row.id),
        userId: String(row.user_id),
        skillId: String(row.skill_id),
        name: trimmedName,
        source: String(row.source ?? "RESUME"),
      };
    },
  };
}
