"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth/session";
import { getJobApplicationRepository } from "@/lib/repositories";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { JOB_APPLICATION_STATUS_ORDER, type JobApplicationStatus } from "@/types";

/**
 * 회원이 공고에 대해 "지원했어요 / 면접 봤어요 / 취업했어요"를 직접 표시한다.
 * 지원은 외부 사이트에서 이뤄져 우리가 확인할 수 없다. 이 값이 마이페이지 5단계의 완료 근거다.
 */
export async function reportJobApplicationAction(input: { jobId: string; status: JobApplicationStatus }) {
  const user = await requireSessionUser();
  if (!JOB_APPLICATION_STATUS_ORDER.includes(input.status)) throw new Error("알 수 없는 상태입니다.");

  const application = await getJobApplicationRepository().upsert(user.id, input.jobId, input.status);
  await logActivityEvent({
    userId: user.id,
    eventType: "job_application_reported",
    entityType: "job",
    entityId: input.jobId,
    metadata: { status: input.status },
  }).catch(() => {});
  revalidatePath("/mypage");
  return { status: application.status };
}

/** 잘못 눌렀을 때 되돌린다. 표시 자체를 지운다. */
export async function clearJobApplicationAction(input: { jobId: string }) {
  const user = await requireSessionUser();
  await getJobApplicationRepository().remove(user.id, input.jobId);
  revalidatePath("/mypage");
  return { cleared: true };
}
