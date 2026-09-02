"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth/session";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { getProfileRepository } from "@/lib/repositories/profile-repository";
import { getCareerProfileRepository, findCareerProfileByUserId } from "@/lib/repositories";
import { recalculateLeadScore } from "@/services/lead-score.service";
import { syncHeldQualifications } from "@/services/career-profile-merge.service";
import { normalizePhone, isValidKoreanPhone } from "@/lib/utils/phone";
import { QUALIFICATION_OPTIONS } from "./qualification-options";
import type { DesiredStartTiming, EmploymentStatus, Region, WorkType } from "@/types";

export interface ProfileEditFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

/**
 * /mypage/profile 저장. Profile(이름/전화번호)과 Career Profile(취업 관련 정보)의 책임을 구분해
 * 각각의 Repository로 나눠 갱신한다. userId는 항상 서버 세션에서 도출한다 (클라이언트 입력 불신).
 *
 * 매 입력마다가 아니라 "저장" 시 1회만 호출되므로 Lead 재계산은 여기서 수행해도 무겁지 않다.
 * 전체 Match 재계산(추천 직업/공고 재산정)은 이번 STEP에서는 트리거하지 않는다 (스펙 23번:
 * 매 입력마다 무거운 전체 Match를 실행하지 않는다 - 저장 직후 필요하면 사용자가 각 서비스에서
 * 다시 조회할 때 최신 Career Profile 기준으로 자연히 재계산된다).
 */
export async function updateProfileAction(
  _prev: ProfileEditFormState,
  formData: FormData,
): Promise<ProfileEditFormState> {
  const user = await requireSessionUser();

  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const region = String(formData.get("region") ?? "") || undefined;
  const employmentStatus = String(formData.get("employmentStatus") ?? "") || undefined;
  const desiredStartTiming = String(formData.get("desiredStartTiming") ?? "") || undefined;
  const desiredSalaryMinRaw = String(formData.get("desiredSalaryMin") ?? "").trim();
  const desiredSalaryMaxRaw = String(formData.get("desiredSalaryMax") ?? "").trim();
  const desiredJobCategories = formData.getAll("desiredJobCategories").map(String).filter(Boolean);
  const desiredWorkTypes = formData.getAll("desiredWorkTypes").map(String).filter(Boolean) as WorkType[];
  const isOpenToTraining = formData.get("isOpenToTraining") === "on";
  const heldQualifications = formData.getAll("heldQualifications").map(String).filter(Boolean);
  const marketingConsent = formData.get("marketingConsent") === "on";

  const fieldErrors: Record<string, string> = {};
  if (!name || name.length < 2) fieldErrors.name = "이름을 2자 이상 입력해주세요.";
  if (phoneRaw && !isValidKoreanPhone(phoneRaw)) fieldErrors.phone = "휴대전화번호 형식을 확인해주세요.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const phone = normalizePhone(phoneRaw);

  await getProfileRepository().update(user.id, { name, phone });
  await applyMarketingConsent(user.id, marketingConsent);

  const existing = await findCareerProfileByUserId(user.id);
  const careerPatch = {
    region: region as Region | undefined,
    employmentStatus: employmentStatus as EmploymentStatus | undefined,
    desiredStartTiming: desiredStartTiming as DesiredStartTiming | undefined,
    desiredSalaryMin: desiredSalaryMinRaw ? Number(desiredSalaryMinRaw) : undefined,
    desiredSalaryMax: desiredSalaryMaxRaw ? Number(desiredSalaryMaxRaw) : undefined,
    desiredJobCategories: desiredJobCategories.length > 0 ? desiredJobCategories : undefined,
    desiredWorkTypes: desiredWorkTypes.length > 0 ? desiredWorkTypes : undefined,
    isOpenToTraining,
  };

  if (existing) {
    await getCareerProfileRepository().update(existing.id, careerPatch);
  } else {
    await getCareerProfileRepository().create({ userId: user.id, ...careerPatch });
  }

  // 보유 자격은 career_profiles 가 아니라 Career DB(user_qualifications)가 원본이다 - 온보딩·진단과 같은 곳.
  await syncHeldQualifications(user.id, heldQualifications, QUALIFICATION_OPTIONS);

  await logActivityEvent({
    userId: user.id,
    eventType: "profile_updated",
    entityType: "career_profile",
    metadata: { updatedFields: Object.keys(careerPatch).filter((k) => careerPatch[k as keyof typeof careerPatch] !== undefined) },
  });

  await recalculateLeadScore(user.id);

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  return { success: true };
}

/**
 * 알림톡(마케팅) 수신 동의를 회원 뜻대로 켜고 끈다.
 * 켤 때만 동의 시각을 새로 적고, 이미 같은 값이면 아무것도 안 한다 (동의 시각이 매번 갱신되지 않게).
 */
async function applyMarketingConsent(userId: string, consent: boolean): Promise<boolean> {
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

/** 소셜 가입 직후 안내 창 등에서 동의만 따로 저장할 때. */
export async function setMarketingConsentAction(input: { consent: boolean }): Promise<{ consent: boolean }> {
  const user = await requireSessionUser();
  await applyMarketingConsent(user.id, input.consent);
  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  revalidatePath("/onboarding/profile");
  return { consent: input.consent };
}
