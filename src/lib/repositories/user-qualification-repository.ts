import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseUserQualificationRepository } from "./supabase/user-qualification.supabase-repository";

/** Career DB에 저장된 보유 자격 1건 (qualifications 카탈로그 + user_qualifications 조인 결과). */
export interface UserQualificationRecord {
  id: string;
  userId: string;
  qualificationId: string;
  name: string;
  source: string;
  acquiredAt?: string;
  expiresAt?: string;
}

/**
 * STEP2에서 설계된 qualifications(마스터 카탈로그)/user_qualifications(보유현황) 구조를 재사용한다.
 * 지금까지는 이 두 테이블을 실제로 쓰는 코드가 없었다 (career-profile.supabase-repository.ts 주석 참고).
 * STEP 7 Resume Builder가 최초로 이 구조를 실사용한다: 이력서에 자격증을 추가하면
 * qualifications에 없는 이름은 새로 만들고(find-or-create), user_qualifications에 upsert 한다.
 */
export interface UserQualificationRepository {
  findByUserId(userId: string): Promise<UserQualificationRecord[]>;
  /** 이름으로 qualifications 카탈로그를 find-or-create 하고, user_qualifications를 upsert 한다. */
  upsertFromResume(params: {
    userId: string;
    name: string;
    acquiredAt?: string;
    expiresAt?: string;
    sourceResumeId: string;
  }): Promise<UserQualificationRecord>;
}

function createMockUserQualificationRepository(): UserQualificationRepository {
  const qualifications = new Map<string, { id: string; name: string }>();
  const userQualifications: UserQualificationRecord[] = [];
  let seq = 0;

  return {
    async findByUserId(userId) {
      return userQualifications.filter((q) => q.userId === userId);
    },
    async upsertFromResume({ userId, name, acquiredAt, expiresAt, sourceResumeId }) {
      let qualification = [...qualifications.values()].find((q) => q.name === name);
      if (!qualification) {
        qualification = { id: `qualification-${Date.now()}-${seq++}`, name };
        qualifications.set(qualification.id, qualification);
      }
      const existing = userQualifications.find((q) => q.userId === userId && q.qualificationId === qualification!.id);
      if (existing) {
        existing.acquiredAt = acquiredAt ?? existing.acquiredAt;
        existing.expiresAt = expiresAt ?? existing.expiresAt;
        existing.source = "RESUME";
        return existing;
      }
      const created: UserQualificationRecord = {
        id: `user-qualification-${Date.now()}-${seq++}`,
        userId,
        qualificationId: qualification.id,
        name: qualification.name,
        source: "RESUME",
        acquiredAt,
        expiresAt,
      };
      userQualifications.push(created);
      void sourceResumeId;
      return created;
    },
  };
}

let repository: UserQualificationRepository | null = null;

export function getUserQualificationRepository(): UserQualificationRepository {
  if (!repository) {
    repository = resolveRepository("UserQualificationRepository", {
      mock: createMockUserQualificationRepository,
      supabase: createSupabaseUserQualificationRepository,
    });
  }
  return repository;
}
