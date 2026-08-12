import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseUserSkillRepository } from "./supabase/user-skill.supabase-repository";

export interface UserSkillRecord {
  id: string;
  userId: string;
  skillId: string;
  name: string;
  source: string;
}

/**
 * Career DB 스킬 반영 (스펙 10/22/50번). qualifications와 동일한 패턴으로
 * skills 마스터 카탈로그 + user_skills 매핑 테이블을 find-or-create/upsert 한다.
 */
export interface UserSkillRepository {
  findByUserId(userId: string): Promise<UserSkillRecord[]>;
  upsertFromResume(params: { userId: string; name: string; sourceResumeId: string }): Promise<UserSkillRecord>;
}

function createMockUserSkillRepository(): UserSkillRepository {
  const skills = new Map<string, { id: string; name: string }>();
  const userSkills: UserSkillRecord[] = [];
  let seq = 0;

  return {
    async findByUserId(userId) {
      return userSkills.filter((s) => s.userId === userId);
    },
    async upsertFromResume({ userId, name, sourceResumeId }) {
      let skill = [...skills.values()].find((s) => s.name === name);
      if (!skill) {
        skill = { id: `skill-${Date.now()}-${seq++}`, name };
        skills.set(skill.id, skill);
      }
      const existing = userSkills.find((s) => s.userId === userId && s.skillId === skill!.id);
      if (existing) return existing;
      const created: UserSkillRecord = {
        id: `user-skill-${Date.now()}-${seq++}`,
        userId,
        skillId: skill.id,
        name: skill.name,
        source: "RESUME",
      };
      userSkills.push(created);
      void sourceResumeId;
      return created;
    },
  };
}

let repository: UserSkillRepository | null = null;

export function getUserSkillRepository(): UserSkillRepository {
  if (!repository) {
    repository = resolveRepository("UserSkillRepository", {
      mock: createMockUserSkillRepository,
      supabase: createSupabaseUserSkillRepository,
    });
  }
  return repository;
}
