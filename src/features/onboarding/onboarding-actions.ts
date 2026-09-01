"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/auth/session";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { getProfileRepository, type ProfileUpdateInput } from "@/lib/repositories/profile-repository";
import { getCareerProfileRepository, findCareerProfileByUserId } from "@/lib/repositories";
import { recalculateLeadScore } from "@/services/lead-score.service";
import { promoteAssessmentQualifications } from "@/services/career-profile-merge.service";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { normalizePhone, isValidKoreanPhone } from "@/lib/utils/phone";
import type { DesiredStartTiming, EmploymentStatus, Region, WorkType } from "@/types";

export interface OnboardingProfileInput {
  next: string;
  employmentStatus?: string;
  region?: string;
  desiredStartTiming?: string;
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  desiredWorkTypes?: string[];
  desiredJobCategories?: string[];
  /** 보유 자격증 이름 목록 (선택 스텝). Career DB(user_qualifications)로 승격된다. */
  heldQualifications?: string[];
  isOpenToTraining?: boolean;
  phone?: string;
  /** 연락처·동의를 물어본 경우에만 넘어온다. 안 물어본 사용자의 기존 동의를 끄지 않기 위함. */
  marketingConsent?: boolean;
}

export interface OnboardingSaveResult {
  error?: string;
  phoneError?: string;
}

/**
 * 가입 직후 취업 프로필 온보딩 저장.
 *
 * 화면이 단계별 위저드라 단계마다 form을 제출하지 않는다. 마지막에 모아서 한 번 저장하므로
 * FormData가 아니라 값 객체를 받는다. userId는 항상 서버 세션에서 도출한다.
 *
 * /mypage/profile의 updateProfileAction과 필드는 겹치지만 성격이 다르다. 이름은 가입 때 이미
 * 받았으므로 다시 묻지 않고, 연락처·수신동의는 가입 때 비워둔 사람에게만 물어 값이 온 경우에만
 * 갱신한다.
 */
export async function saveOnboardingProfileAction(
  input: OnboardingProfileInput,
): Promise<OnboardingSaveResult> {
  const user = await requireSessionUser();
  const next = sanitizeNextPath(input.next, "/mypage");

  const phoneRaw = input.phone?.trim() ?? "";
  if (phoneRaw && !isValidKoreanPhone(phoneRaw)) {
    return { phoneError: "휴대전화번호 형식을 확인해주세요." };
  }

  const profilePatch: ProfileUpdateInput = {};
  if (phoneRaw) profilePatch.phone = normalizePhone(phoneRaw);
  if (input.marketingConsent) {
    profilePatch.marketingConsent = true;
    profilePatch.marketingConsentAt = new Date().toISOString();
  }
  if (Object.keys(profilePatch).length > 0) {
    await getProfileRepository().update(user.id, profilePatch);
  }

  const careerPatch = {
    region: (input.region || undefined) as Region | undefined,
    employmentStatus: (input.employmentStatus || undefined) as EmploymentStatus | undefined,
    desiredStartTiming: (input.desiredStartTiming || undefined) as DesiredStartTiming | undefined,
    desiredSalaryMin: input.desiredSalaryMin,
    desiredSalaryMax: input.desiredSalaryMax,
    desiredJobCategories: input.desiredJobCategories?.length ? input.desiredJobCategories : undefined,
    desiredWorkTypes: input.desiredWorkTypes?.length ? (input.desiredWorkTypes as WorkType[]) : undefined,
    isOpenToTraining: input.isOpenToTraining ?? false,
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

  // 보유 자격은 career_profiles가 아니라 Career DB(user_qualifications)가 원본이다 - 진단·이력서와 같은 곳.
  if (input.heldQualifications?.length) {
    await promoteAssessmentQualifications(user.id, input.heldQualifications, "ONBOARDING");
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
export async function skipOnboardingProfileAction(nextPath: string): Promise<void> {
  const user = await requireSessionUser();
  const next = sanitizeNextPath(nextPath, "/mypage");
  await logActivityEvent({
    userId: user.id,
    eventType: "profile_updated",
    entityType: "career_profile",
    metadata: { source: "onboarding", skipped: true },
  });
  redirect(next);
}
