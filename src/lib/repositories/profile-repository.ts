import type { Profile } from "@/types";
import { mockAdminUsers } from "@/mocks/users.mock";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseProfileRepository } from "./supabase/profile.supabase-repository";

/**
 * profiles 테이블 조회용 최소 Repository.
 *
 * 실제 회원가입/로그인(Supabase Auth) 플로우는 다음 STEP에서 연결되지만,
 * Lead 생성 시 표시 이름을 조회하거나 관리자 화면에서 프로필을 조회하는 등
 * "이미 존재하는 프로필을 읽는" 용도는 지금 필요하므로 read 전용으로 먼저 만든다.
 */
export interface ProfileUpdateInput {
  name?: string;
  phone?: string;
}

export interface ProfileRepository {
  findById(userId: string): Promise<Profile | null>;
  /** /mypage/profile 수정 화면에서 사용 (이름/전화번호만 - 이메일/role/동의여부는 이 경로로 변경 불가). */
  update(userId: string, patch: ProfileUpdateInput): Promise<Profile | null>;
}

function createMockProfileRepository(): ProfileRepository {
  return {
    async findById(userId: string) {
      const row = mockAdminUsers.find((u) => u.id === userId);
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: "USER",
        marketingConsent: true,
        marketingConsentAt: `${row.joinedAt}T00:00:00.000Z`,
        privacyConsentAt: `${row.joinedAt}T00:00:00.000Z`,
        regionSido: row.region,
        createdAt: `${row.joinedAt}T00:00:00.000Z`,
        updatedAt: `${row.joinedAt}T00:00:00.000Z`,
        lastActiveAt: new Date().toISOString(),
      } satisfies Profile;
    },
    async update(userId, patch) {
      const row = mockAdminUsers.find((u) => u.id === userId);
      if (!row) return null;
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.phone !== undefined) row.phone = patch.phone;
      return this.findById(userId);
    },
  };
}

let repository: ProfileRepository | null = null;

export function getProfileRepository(): ProfileRepository {
  if (!repository) {
    repository = resolveRepository("ProfileRepository", {
      mock: createMockProfileRepository,
      supabase: createSupabaseProfileRepository,
    });
  }
  return repository;
}
