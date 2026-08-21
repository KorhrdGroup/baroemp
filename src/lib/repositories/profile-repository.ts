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
  /**
   * 마케팅(알림톡) 수신동의. 가입 후 온보딩에서 사용자가 직접 켤 때만 전달한다.
   * 동의는 사용자 의사표시이므로 서버가 임의로 끄지 않으며, 켤 때 marketingConsentAt을 함께 기록한다.
   */
  marketingConsent?: boolean;
  marketingConsentAt?: string;
}

export interface ProfileRepository {
  findById(userId: string): Promise<Profile | null>;
  /** /mypage/profile 수정, 온보딩 동의 갱신에서 사용 (이메일/role은 이 경로로 변경 불가). */
  update(userId: string, patch: ProfileUpdateInput): Promise<Profile | null>;
}

function createMockProfileRepository(): ProfileRepository {
  // mockAdminUsers에는 동의 관련 컬럼이 없다. Mock Mode에서 온보딩 동의 변경을 확인할 수 있도록
  // 시드 데이터를 건드리지 않고 덮어쓴 값만 따로 들고 있는다 (프로세스 메모리 한정).
  const consentOverrides = new Map<string, { marketingConsent: boolean; marketingConsentAt?: string }>();

  return {
    async findById(userId: string) {
      const row = mockAdminUsers.find((u) => u.id === userId);
      if (!row) return null;
      const consent = consentOverrides.get(userId);
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: "USER",
        marketingConsent: consent?.marketingConsent ?? true,
        marketingConsentAt: consent?.marketingConsentAt ?? `${row.joinedAt}T00:00:00.000Z`,
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
      if (patch.marketingConsent !== undefined) {
        consentOverrides.set(userId, {
          marketingConsent: patch.marketingConsent,
          marketingConsentAt: patch.marketingConsentAt,
        });
      }
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
