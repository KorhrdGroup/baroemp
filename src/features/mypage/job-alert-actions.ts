"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth/session";
import { getJobAlertSettings, listSigunguForRegion, saveJobAlertSettings, type JobAlertSettings } from "@/services/job-alert.service";

export async function getJobAlertSettingsAction(): Promise<JobAlertSettings> {
  const user = await requireSessionUser();
  return getJobAlertSettings(user.id);
}

export async function saveJobAlertSettingsAction(input: {
  enabled: boolean;
  region?: string;
  regionSigungu?: string;
  jobCategories: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireSessionUser();
  if (input.enabled && !input.region) return { ok: false, error: "알림을 받을 지역을 골라주세요." };
  await saveJobAlertSettings(user.id, {
    enabled: input.enabled,
    region: input.region,
    regionSigungu: input.regionSigungu,
    jobCategories: input.jobCategories.slice(0, 5),
  });
  revalidatePath("/mypage");
  return { ok: true };
}

export async function listSigunguAction(region: string): Promise<string[]> {
  await requireSessionUser();
  return listSigunguForRegion(region);
}
