import "server-only";
import { linkAnonymousCareerDataToUser } from "@/services/identity-link.service";

/**
 * 로그인/회원가입 성공 흐름에서 호출하는 안전 래퍼.
 * anonymous 데이터 병합은 "있으면 좋은" 보조 기능이므로 실패해도 로그인/가입 자체를 막지 않는다
 * (Member-first가 우선이라는 스펙 13번 원칙 - 병합 실패로 정상 Flow가 깨지면 안 된다).
 */
export async function linkAnonymousCareraDataToUserSafe(anonymousId: string, userId: string): Promise<void> {
  try {
    await linkAnonymousCareerDataToUser(anonymousId, userId);
  } catch (err) {
    console.error("[anonymous-merge] anonymous 데이터 병합 실패 (로그인/가입은 계속 진행):", err);
  }
}
