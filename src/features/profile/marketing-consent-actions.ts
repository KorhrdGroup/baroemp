"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth/session";
import { applyMarketingConsent } from "./marketing-consent";

/**
 * 소셜 가입 직후 안내 창에서 동의만 따로 저장할 때.
 * profile-actions.ts 에 두면 개발 서버가 새 액션을 못 알아봐(500 "reading 'apply'") 파일을 따로 뒀다.
 */
export async function setMarketingConsentAction(input: { consent: boolean }): Promise<{ consent: boolean }> {
  const user = await requireSessionUser();
  await applyMarketingConsent(user.id, input.consent);
  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  revalidatePath("/onboarding/profile");
  return { consent: input.consent };
}
