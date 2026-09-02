import "server-only";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { getProfileRepository } from "@/lib/repositories/profile-repository";

/**
 * 알림톡(마케팅) 수신 동의를 회원 뜻대로 켜고 끈다.
 * 켤 때만 동의 시각을 새로 적고, 이미 같은 값이면 아무것도 안 한다 (동의 시각이 매번 갱신되지 않게).
 */
export async function applyMarketingConsent(userId: string, consent: boolean): Promise<boolean> {
  const profile = await getProfileRepository().findById(userId);
  if (!profile || profile.marketingConsent === consent) return false;
  await getProfileRepository().update(userId, {
    marketingConsent: consent,
    marketingConsentAt: consent ? new Date().toISOString() : undefined,
  });
  await logActivityEvent({
    userId,
    eventType: "marketing_consent_changed",
    entityType: "career_profile",
    metadata: { consent },
  }).catch(() => {});
  return true;
}
