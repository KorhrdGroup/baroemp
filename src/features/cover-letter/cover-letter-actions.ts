"use server";

import { revalidatePath } from "next/cache";

import type {
  AICoverLetterDraftResult,
  AIResumeReviewResult,
  CoverLetter,
  CoverLetterDetail,
  CoverLetterDetailSaveInput,
  CoverLetterTemplate,
  ResumeMarketComparisonView,
} from "@/types";

export type CoverLetterSaveActionInput = Omit<CoverLetterDetailSaveInput, "coverLetter"> & {
  coverLetter: Omit<CoverLetterDetailSaveInput["coverLetter"], "userId"> & { id: string };
};
import { requireSessionUser } from "@/lib/auth/session";
import { getCoverLetterRepository, getCoverLetterTemplateRepository } from "@/lib/repositories";
import {
  createCoverLetterFromTemplate,
  deleteCoverLetter,
  getCoverLetterDetail,
  listCoverLettersForUser,
  saveCoverLetterDetail,
  changeCoverLetterTemplate,
} from "@/services/cover-letter.service";
import { generateCoverLetterDraftWithAI, reviewCoverLetterSectionWithAI } from "@/services/ai-resume.service";
import { getCoverLetterMarketComparison } from "@/services/resume-market-comparison.service";

async function requireOwnCoverLetter(coverLetterId: string): Promise<CoverLetter> {
  const user = await requireSessionUser();
  const coverLetter = await getCoverLetterRepository().findById(coverLetterId);
  if (!coverLetter || coverLetter.userId !== user.id) {
    throw new Error("본인의 자기소개서만 접근할 수 있습니다.");
  }
  return coverLetter;
}

export async function listCoverLetterTemplatesAction(): Promise<CoverLetterTemplate[]> {
  const templates = await getCoverLetterTemplateRepository().findAll({ status: "active" });
  return [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function listMyCoverLettersAction(): Promise<CoverLetter[]> {
  const user = await requireSessionUser();
  return listCoverLettersForUser(user.id);
}

export async function getMyCoverLetterDetailAction(coverLetterId: string): Promise<CoverLetterDetail | null> {
  await requireOwnCoverLetter(coverLetterId);
  return getCoverLetterDetail(coverLetterId);
}

export async function createCoverLetterAction(input: {
  templateId: string;
  title?: string;
  resumeId?: string;
  targetJobId?: string;
  targetOccupationId?: string;
}): Promise<CoverLetterDetail> {
  const user = await requireSessionUser();
  return createCoverLetterFromTemplate({ userId: user.id, ...input });
}

export async function saveCoverLetterAction(input: CoverLetterSaveActionInput): Promise<CoverLetterDetail> {
  if (!input.coverLetter.id) throw new Error("coverLetter.id가 필요합니다.");
  const coverLetter = await requireOwnCoverLetter(input.coverLetter.id);
  return saveCoverLetterDetail({ ...input, coverLetter: { ...input.coverLetter, userId: coverLetter.userId } });
}

export async function deleteCoverLetterAction(coverLetterId: string): Promise<void> {
  await requireOwnCoverLetter(coverLetterId);
  await deleteCoverLetter(coverLetterId);
  // 목록은 서버 컴포넌트라 캐시를 비워야 삭제 결과가 화면에 반영된다.
  revalidatePath("/resume");
}

export async function reviewCoverLetterSectionAiAction(input: {
  coverLetterId: string;
  question: string;
  content: string;
}): Promise<AIResumeReviewResult> {
  await requireOwnCoverLetter(input.coverLetterId);
  return reviewCoverLetterSectionWithAI(input);
}

export async function getCoverLetterMarketComparisonAction(coverLetterId: string): Promise<ResumeMarketComparisonView> {
  await requireOwnCoverLetter(coverLetterId);
  return getCoverLetterMarketComparison(coverLetterId);
}

export async function generateCoverLetterDraftAiAction(input: {
  coverLetterId: string;
  question: string;
  questionType: string;
  characterLimit?: number;
  candidateExperiences: { title: string; situation?: string; task?: string; action?: string; result?: string }[];
}): Promise<AICoverLetterDraftResult> {
  await requireOwnCoverLetter(input.coverLetterId);
  return generateCoverLetterDraftWithAI(input);
}

export async function changeCoverLetterTemplateAction(
  coverLetterId: string,
  templateId: string,
): Promise<CoverLetterDetail | null> {
  await requireOwnCoverLetter(coverLetterId);
  return changeCoverLetterTemplate(coverLetterId, templateId);
}
