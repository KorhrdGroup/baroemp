"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth/session";
import { getProfileRepository } from "@/lib/repositories/profile-repository";
import { recalculateLeadScore } from "@/services/lead-score.service";
import { normalizePhone, isValidKoreanPhone } from "@/lib/utils/phone";

export interface AccountFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

/**
 * /mypage/account 저장 - 이름 · 휴대전화만. 취업 프로필(희망 조건)은 /mypage/profile 이 따로 저장한다.
 * userId 는 늘 서버 세션에서 도출한다(클라이언트 입력 불신). 이메일은 이 경로로 바꾸지 않는다.
 */
export async function updateAccountAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireSessionUser();
  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!name || name.length < 2) fieldErrors.name = "이름을 2자 이상 입력해주세요.";
  if (phoneRaw && !isValidKoreanPhone(phoneRaw)) fieldErrors.phone = "휴대전화번호 형식을 확인해주세요.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await getProfileRepository().update(user.id, { name, phone: normalizePhone(phoneRaw) });
  await recalculateLeadScore(user.id);

  revalidatePath("/mypage");
  revalidatePath("/mypage/account");
  return { success: true };
}
