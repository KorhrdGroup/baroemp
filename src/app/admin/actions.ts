"use server";

import { revalidatePath } from "next/cache";
import { createContent, updateContent } from "@/services/content.service";
import { recalculateLeadScore } from "@/services/lead-score.service";
import { syncJobsFromProvider } from "@/services/job-sync.service";
import { syncSupportProgramsFromProvider } from "@/services/support-sync.service";
import { getAssessmentRepository, getJobRepository, getSupportProgramRepository } from "@/lib/repositories";
import type { CareerContentInput, ContentType, JobSyncSummary, PublishStatus, SupportSyncSummary } from "@/types";

export async function saveContentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const input: CareerContentInput = {
    title: String(formData.get("title") ?? "").trim(),
    type: String(formData.get("type") ?? "OTHER") as ContentType,
    description: String(formData.get("description") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    category: String(formData.get("category") ?? ""),
    price: Number(formData.get("price") ?? 0),
    isPaid: formData.get("isPaid") === "on" || formData.get("isPaid") === "true",
    status: String(formData.get("status") ?? "draft") as PublishStatus,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    relatedJobs: [],
    targetAgeGroups: [],
    targetConditions: [],
    requiredQualifications: [],
    recommendationRules: { weight: Number(formData.get("weight") ?? 1) || 1 },
  };

  if (!input.title) {
    return { ok: false as const, message: "제목을 입력하세요." };
  }

  if (id) {
    await updateContent(id, input);
    revalidatePath("/admin/contents");
    revalidatePath(`/admin/contents/${id}`);
    return { ok: true as const, id };
  }

  const created = await createContent(input);
  revalidatePath("/admin/contents");
  return { ok: true as const, id: created.id };
}

export async function recalculateLeadScoreAction(userId: string) {
  const result = await recalculateLeadScore(userId);
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/leads");
  return {
    ok: true as const,
    score: result.breakdown.totalScore,
    grade: result.breakdown.grade,
  };
}

export async function toggleAssessmentActiveAction(assessmentId: string) {
  const repo = getAssessmentRepository();
  const assessment = await repo.findById(assessmentId);
  if (!assessment) return { ok: false as const, message: "검사를 찾을 수 없습니다." };
  await repo.update(assessmentId, { isActive: !assessment.isActive });
  revalidatePath("/admin/assessments");
  revalidatePath(`/admin/assessments/${assessmentId}`);
  return { ok: true as const, isActive: !assessment.isActive };
}

export async function syncJobsAction(): Promise<JobSyncSummary> {
  const summary = await syncJobsFromProvider({ triggeredBy: "admin" });
  revalidatePath("/admin/jobs");
  return summary;
}

export async function toggleJobActiveAction(jobId: string): Promise<{ ok: boolean; isActive?: boolean }> {
  const repo = getJobRepository();
  const job = await repo.findById(jobId);
  if (!job) return { ok: false };
  const updated = await repo.update(jobId, {
    isActive: !job.isActive,
    closedAt: !job.isActive ? undefined : new Date().toISOString(),
  });
  revalidatePath("/admin/jobs");
  return { ok: true, isActive: updated?.isActive };
}

export async function syncSupportProgramsAction(): Promise<SupportSyncSummary> {
  const summary = await syncSupportProgramsFromProvider({ triggeredBy: "admin" });
  revalidatePath("/admin/support");
  return summary;
}

export async function toggleSupportProgramActiveAction(
  supportProgramId: string,
): Promise<{ ok: boolean; isActive?: boolean }> {
  const repo = getSupportProgramRepository();
  const program = await repo.findById(supportProgramId);
  if (!program) return { ok: false };
  const updated = await repo.update(supportProgramId, {
    isActive: !program.isActive,
    closedAt: !program.isActive ? undefined : new Date().toISOString(),
  });
  revalidatePath("/admin/support");
  return { ok: true, isActive: updated?.isActive };
}

/** V1: drag & drop 대신 순서 숫자를 직접 입력해 문항 순서를 변경한다. */
export async function updateQuestionOrderAction(assessmentId: string, questionId: string, newOrder: number) {
  const repo = getAssessmentRepository();
  const assessment = await repo.findById(assessmentId);
  if (!assessment) return { ok: false as const, message: "검사를 찾을 수 없습니다." };

  const questions = assessment.questions.map((q) =>
    q.id === questionId ? { ...q, orderIndex: newOrder } : q,
  );
  await repo.update(assessmentId, { questions });
  revalidatePath(`/admin/assessments/${assessmentId}`);
  return { ok: true as const };
}
