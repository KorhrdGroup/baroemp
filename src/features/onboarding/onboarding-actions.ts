"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/auth/session";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { getProfileRepository } from "@/lib/repositories/profile-repository";
import { getCareerProfileRepository, findCareerProfileByUserId } from "@/lib/repositories";
import { recalculateLeadScore } from "@/services/lead-score.service";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { normalizePhone, isValidKoreanPhone } from "@/lib/utils/phone";
import type { DesiredStartTiming, EmploymentStatus, Region, WorkType } from "@/types";

export interface OnboardingProfileFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * 가입 직후 취업 프로필 온보딩 저장.
 *
 * /mypage/profile의 updateProfileAction과 필드는 겹치지만 성격이 다르다.
 * - 이름은 가입 때 이미 받았으므로 다시 묻지 않는다 (그쪽은 필수 검증 대상).
 * - 연락처·수신동의는 가입 때 비워둔 사람에게만 노출되므로, 값이 온 경우에만 갱신한다.
 * - 저장/건너뛰기 모두 next로 이동시켜 온보딩이 흐름을 끊지 않게 한다.
 */
export async function completeOnboardingProfileAction(
  _prev: OnboardingProfileFormState,
  formData: FormData,
): Promise<OnboardingProfileFormState> {
  const user = await requireSessionUser();
  const next = sanitizeNextPath(String(formData.get("next") ?? ""), "/mypage");

  const phoneRaw = String(formData.get("phone") ?? "").trim();
  if (phoneRaw && !isValidKoreanPhone(phoneRaw)) {
    return { fieldErrors: { phone: "휴대전화번호 형식을 확인해주세요." } };
  }

  const region = String(formData.get("region") ?? "") || undefined;
  const employmentStatus = String(formData.get("employmentStatus") ?? "") || undefined;
  const desiredStartTiming = String(formData.get("desiredStartTiming") ?? "") || undefined;
  const desiredSalaryMinRaw = String(formData.get("desiredSalaryMin") ?? "").trim();
  const desiredSalaryMaxRaw = String(formData.get("desiredSalaryMax") ?? "").trim();
  const desiredJobCategories = formData.getAll("desiredJobCategories").map(String).filter(Boolean);
  const desiredWorkTypes = formData.getAll("desiredWorkTypes").map(String).filter(Boolean) as WorkType[];
  const isOpenToTraining = formData.get("isOpenToTraining") === "on";
  const marketingConsent = formData.get("marketingConsent") === "on";
  // 동의 입력란 자체를 노출하지 않은 사용자(이미 동의한 사람)의 값을 끄지 않기 위한 구분자.
  const marketingConsentAsked = formData.get("marketingConsentAsked") === "1";

  const profilePatch: Parameters<ReturnType<typeof getProfileRepository>["update"]>[1] = {};
  if (phoneRaw) profilePatch.phone = normalizePhone(phoneRaw);
  if (marketingConsentAsked && marketingConsent) {
    profilePatch.marketingConsent = true;
    profilePatch.marketingConsentAt = new Date().toISOString();
  }
  if (Object.keys(profilePatch).length > 0) {
    await getProfileRepository().update(user.id, profilePatch);
  }

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
  const filledFields = Object.keys(careerPatch).filter(
    (k) => careerPatch[k as keyof typeof careerPatch] !== undefined,
  );

  const existing = await findCareerProfileByUserId(user.id);
  if (existing) {
    await getCareerProfileRepository().update(existing.id, careerPatch);
  } else {
    await getCareerProfileRepository().create({ userId: user.id, ...careerPatch });
  }

  await logActivityEvent({
    userId: user.id,
    eventType: "profile_updated",
    entityType: "career_profile",
    metadata: { source: "onboarding", filledFields, marketingConsent: profilePatch.marketingConsent ?? null },
  });

  await recalculateLeadScore(user.id);
  revalidatePath("/mypage");
  redirect(next);
}

/** 건너뛰기. 나중에 다시 권할 수 있도록 건너뛴 사실만 남긴다. */
export async function skipOnboardingProfileAction(formData: FormData): Promise<void> {
  const user = await requireSessionUser();
  const next = sanitizeNextPath(String(formData.get("next") ?? ""), "/mypage");
  await logActivityEvent({
    userId: user.id,
    eventType: "profile_updated",
    entityType: "career_profile",
    metadata: { source: "onboarding", skipped: true },
  });
  redirect(next);
}
