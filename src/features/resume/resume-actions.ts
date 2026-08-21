"use server";

import type {
  AICareerSummaryResult,
  AIResumeReviewResult,
  AISectionRewriteResult,
  AITailorToJobResult,
  Resume,
  ResumeDetail,
  ResumeDetailSaveInput,
  ResumeTemplate,
} from "@/types";

/** 클라이언트는 소유자(userId)를 알 필요/권한이 없으므로, 서버에서 검증된 값으로 채워 넣는다. */
export type ResumeSaveActionInput = Omit<ResumeDetailSaveInput, "resume"> & {
  resume: Omit<ResumeDetailSaveInput["resume"], "userId"> & { id: string };
};
import { requireSessionUser } from "@/lib/auth/session";
import { getResumeRepository, getResumeTemplateRepository } from "@/lib/repositories";
import { logActivityEvent } from "@/lib/activity/event-logger";
import {
  createResumeFromTemplate,
  deleteResume,
  getResumeDetail,
  listResumesForUser,
  saveResumeDetail,
  changeResumeTemplate,
} from "@/services/resume.service";
import {
  generateCareerSummaryWithAI,
  reviewResumeWithAI,
  rewriteResumeSectionWithAI,
  tailorResumeToJobWithAI,
} from "@/services/ai-resume.service";

/**
 * 이 Resume가 현재 로그인 사용자 소유인지 검증한다.
 * Repository는 Service Role(Admin Client)로 동작해 RLS를 우회하므로,
 * "본인 데이터만 CRUD" 라는 경계는 이 Server Action 계층에서 반드시 강제해야 한다.
 */
async function requireOwnResume(resumeId: string): Promise<Resume> {
  const user = await requireSessionUser();
  const resume = await getResumeRepository().findById(resumeId);
  if (!resume || resume.userId !== user.id) {
    throw new Error("본인의 이력서만 접근할 수 있습니다.");
  }
  return resume;
}

export async function listResumeTemplatesAction(): Promise<ResumeTemplate[]> {
  const templates = await getResumeTemplateRepository().findAll({ status: "active" });
  return [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function listMyResumesAction(): Promise<Resume[]> {
  const user = await requireSessionUser();
  return listResumesForUser(user.id);
}

export async function getMyResumeDetailAction(resumeId: string): Promise<ResumeDetail | null> {
  await requireOwnResume(resumeId);
  return getResumeDetail(resumeId);
}

export async function createResumeAction(input: {
  templateId: string;
  title?: string;
  targetJobId?: string;
  targetOccupationId?: string;
}): Promise<ResumeDetail> {
  const user = await requireSessionUser();
  return createResumeFromTemplate({ userId: user.id, ...input });
}

export async function saveResumeAction(input: ResumeSaveActionInput): Promise<ResumeDetail> {
  if (!input.resume.id) throw new Error("resume.id가 필요합니다.");
  const resume = await requireOwnResume(input.resume.id);
  return saveResumeDetail({ ...input, resume: { ...input.resume, userId: resume.userId } });
}

export async function deleteResumeAction(resumeId: string): Promise<void> {
  await requireOwnResume(resumeId);
  await deleteResume(resumeId);
}

export async function reviewResumeAiAction(resumeId: string): Promise<AIResumeReviewResult> {
  await requireOwnResume(resumeId);
  return reviewResumeWithAI(resumeId);
}

export async function rewriteResumeSectionAiAction(input: {
  resumeId: string;
  sectionLabel: string;
  originalText: string;
}): Promise<AISectionRewriteResult> {
  await requireOwnResume(input.resumeId);
  return rewriteResumeSectionWithAI(input);
}

export async function generateCareerSummaryAiAction(resumeId: string): Promise<AICareerSummaryResult> {
  await requireOwnResume(resumeId);
  return generateCareerSummaryWithAI(resumeId);
}

export async function tailorResumeToJobAiAction(resumeId: string, jobId: string): Promise<AITailorToJobResult> {
  await requireOwnResume(resumeId);
  return tailorResumeToJobWithAI(resumeId, jobId);
}

export async function trackResumeExportedAction(resumeId: string, format: "pdf" | "docx"): Promise<void> {
  const resume = await requireOwnResume(resumeId);
  await logActivityEvent({
    userId: resume.userId,
    eventType: "resume_exported",
    entityType: "resume",
    entityId: resumeId,
    metadata: { format },
  });
}

export async function changeResumeTemplateAction(resumeId: string, templateId: string): Promise<ResumeDetail | null> {
  await requireOwnResume(resumeId);
  return changeResumeTemplate(resumeId, templateId);
}
