"use server";

import { revalidatePath } from "next/cache";

import type {
  AICareerSummaryResult,
  AIResumeReviewResult,
  AISectionRewriteResult,
  AITailorToJobResult,
  Resume,
  ResumeDetail,
  ResumeDetailSaveInput,
  ResumeTemplate,
  ResumeMarketComparisonView,
} from "@/types";

/** 클라이언트는 소유자(userId)를 알 필요/권한이 없으므로, 서버에서 검증된 값으로 채워 넣는다. */
export type ResumeSaveActionInput = Omit<ResumeDetailSaveInput, "resume"> & {
  resume: Omit<ResumeDetailSaveInput["resume"], "userId"> & { id: string };
};
import { requireSessionUser } from "@/lib/auth/session";
import { getResumeRepository, getResumeTemplateRepository } from "@/lib/repositories";
import { logActivityEvent } from "@/lib/activity/event-logger";
import type { ResumePrefillChoice } from "@/services/resume.service";
import {
  createResumeFromTemplate,
  deleteResume,
  getResumeDetail,
  listResumesForUser,
  saveResumeDetail,
  setPrimaryResume,
  changeResumeTemplate,
} from "@/services/resume.service";
import {
  generateCareerSummaryWithAI,
  reviewResumeWithAI,
  rewriteResumeSectionWithAI,
  tailorResumeToJobWithAI,
} from "@/services/ai-resume.service";
import { getResumeMarketComparison } from "@/services/resume-market-comparison.service";

/**
 * 이 Resume가 현재 로그인 사용자 소유인지 검증한다.
 * Repository는 Service Role(Admin Client)로 동작해 RLS를 우회하므로,
 * "본인 데이터만 CRUD" 라는 경계는 이 Server Action 계층에서 반드시 강제해야 한다.
 */
/**
 * 증명사진 업로드. 공개 버킷(resume-photos)에 올리고 공개 URL을 돌려준다.
 * URL은 클라이언트가 폼 상태에 넣고 저장 시 resumes.photo_url로 함께 저장된다.
 */
export async function uploadResumePhotoAction(resumeId: string, formData: FormData): Promise<{ url: string }> {
  await requireOwnResume(resumeId);

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("업로드할 파일이 없습니다.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("JPG, PNG 형식의 사진만 올릴 수 있습니다.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("사진은 5MB 이하로 올려주세요.");

  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("저장소 설정이 없어 사진을 올릴 수 없습니다.");

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  // 같은 이력서에 다시 올리면 이전 파일을 덮어써 찌꺼기가 쌓이지 않게 한다.
  const path = `${resumeId}/photo.${ext}`;
  const { error } = await admin.storage
    .from("resume-photos")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
  if (error) throw new Error(`사진 업로드에 실패했습니다: ${error.message}`);

  const { data } = admin.storage.from("resume-photos").getPublicUrl(path);
  // 같은 경로를 덮어쓰므로 브라우저 캐시를 피하려면 버전 쿼리를 붙인다.
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

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
  /** 작성 시작 화면에서 고른 항목. 비우면 양식이 정한 항목을 따른다. */
  sectionCodes?: string[];
  /** 불러올 내 정보 중 무엇을 쓸지 */
  include?: ResumePrefillChoice;
}): Promise<ResumeDetail> {
  const user = await requireSessionUser();
  return createResumeFromTemplate({ userId: user.id, ...input });
}

export async function saveResumeAction(input: ResumeSaveActionInput): Promise<ResumeDetail> {
  if (!input.resume.id) throw new Error("resume.id가 필요합니다.");
  const resume = await requireOwnResume(input.resume.id);
  return saveResumeDetail({ ...input, resume: { ...input.resume, userId: resume.userId } });
}

/**
 * 대표 이력서 지정. 대표는 하나뿐이라, 이걸 올리면 전에 대표였던 이력서는 자동으로 내려간다.
 * 지원금 진단·관리자 화면이 회원당 이력서 하나를 골라 볼 때 이 이력서를 본다.
 */
export async function setPrimaryResumeAction(resumeId: string): Promise<void> {
  await requireOwnResume(resumeId);
  await setPrimaryResume(resumeId);
  revalidatePath("/resume");
  revalidatePath("/mypage");
}

export async function deleteResumeAction(resumeId: string): Promise<void> {
  await requireOwnResume(resumeId);
  await deleteResume(resumeId);
  // 목록은 서버 컴포넌트라 캐시를 비워야 삭제 결과가 화면에 반영된다.
  revalidatePath("/resume");
  revalidatePath("/mypage");
}

export async function reviewResumeAiAction(resumeId: string): Promise<AIResumeReviewResult> {
  await requireOwnResume(resumeId);
  return reviewResumeWithAI(resumeId);
}

export async function getResumeMarketComparisonAction(resumeId: string): Promise<ResumeMarketComparisonView> {
  await requireOwnResume(resumeId);
  return getResumeMarketComparison(resumeId);
}

export async function rewriteResumeSectionAiAction(input: {
  resumeId: string;
  sectionLabel: string;
  originalText: string;
  roleContext?: string;
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
