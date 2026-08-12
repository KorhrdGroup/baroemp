import type { UserAcquisition } from "@/types";
import { mockAdminUsers } from "@/mocks/users.mock";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseUserAcquisitionRepository } from "./supabase/user-acquisition.supabase-repository";

/**
 * user_acquisition 테이블 조회용 Repository (스펙 28번 - Acquisition/UTM).
 *
 * 회원가입 시점에 DB Trigger(0033)가 빈 행을 만들고, applyAcquisitionTouch()가
 * first/last-touch 쿠키 값으로 채운다. 이 Repository는 그 결과를 읽는 용도.
 */
export interface UserAcquisitionRepository {
  findByUserId(userId: string): Promise<UserAcquisition | null>;
}

function createMockUserAcquisitionRepository(): UserAcquisitionRepository {
  return {
    async findByUserId(userId: string) {
      const row = mockAdminUsers.find((u) => u.id === userId);
      if (!row) return null;
      return {
        id: `acq-${userId}`,
        userId,
        utmSource: row.signupChannel,
        utmMedium: "cpc",
        utmCampaign:
          row.signupChannel === "google"
            ? "spring_reemployment"
            : row.signupChannel === "kakao"
              ? "care_worker_ads"
              : "brand_search",
        landingPage: "/",
        referrer: "https://ads.example.com",
        firstTouchAt: `${row.joinedAt}T00:00:00.000Z`,
        lastTouchAt: new Date().toISOString(),
      } satisfies UserAcquisition;
    },
  };
}

let repository: UserAcquisitionRepository | null = null;

export function getUserAcquisitionRepository(): UserAcquisitionRepository {
  if (!repository) {
    repository = resolveRepository("UserAcquisitionRepository", {
      mock: createMockUserAcquisitionRepository,
      supabase: createSupabaseUserAcquisitionRepository,
    });
  }
  return repository;
}
