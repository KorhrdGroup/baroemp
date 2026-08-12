import type { CoverLetter, CoverLetterDetail, CoverLetterDetailSaveInput } from "@/types";
import {
  getCoverLetterRepository,
  getCoverLetterSectionRepository,
  getCoverLetterTemplateRepository,
} from "@/lib/repositories";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { recalculateLeadScore } from "./lead-score.service";

export async function listCoverLettersForUser(userId: string): Promise<CoverLetter[]> {
  const items = await getCoverLetterRepository().findAll({ userId });
  return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getCoverLetterDetail(coverLetterId: string): Promise<CoverLetterDetail | null> {
  const coverLetter = await getCoverLetterRepository().findById(coverLetterId);
  if (!coverLetter) return null;
  const [sections, template] = await Promise.all([
    getCoverLetterSectionRepository().getSections(coverLetterId),
    coverLetter.templateId ? getCoverLetterTemplateRepository().findById(coverLetter.templateId) : Promise.resolve(null),
  ]);
  return { coverLetter, sections, template: template ?? undefined };
}

export async function createCoverLetterFromTemplate(params: {
  userId: string;
  templateId: string;
  title?: string;
  resumeId?: string;
  targetJobId?: string;
  targetOccupationId?: string;
}): Promise<CoverLetterDetail> {
  const template = await getCoverLetterTemplateRepository().findById(params.templateId);

  const coverLetter = await getCoverLetterRepository().create({
    userId: params.userId,
    title: params.title?.trim() || `${template?.name ?? "새"} 자기소개서`,
    templateId: params.templateId,
    resumeId: params.resumeId,
    targetJobId: params.targetJobId,
    targetOccupationId: params.targetOccupationId,
    status: "draft",
  });

  const defaultQuestions = template?.defaultQuestions ?? [];
  await getCoverLetterSectionRepository().replaceSections(
    coverLetter.id,
    defaultQuestions.map((q, i) => ({
      questionType: q.questionType,
      question: q.question,
      content: "",
      characterLimit: q.characterLimit,
      orderIndex: i,
    })),
  );

  await logActivityEvent({
    userId: params.userId,
    eventType: "cover_letter_created",
    entityType: "cover_letter",
    entityId: coverLetter.id,
    metadata: { templateCode: template?.code },
  });
  if (params.targetJobId) {
    await logActivityEvent({
      userId: params.userId,
      eventType: "target_job_selected",
      entityType: "cover_letter",
      entityId: coverLetter.id,
      metadata: { jobId: params.targetJobId },
    });
  }
  await recalculateLeadScore(params.userId);

  return (await getCoverLetterDetail(coverLetter.id))!;
}

export async function saveCoverLetterDetail(input: CoverLetterDetailSaveInput): Promise<CoverLetterDetail> {
  const coverLetterId = input.coverLetter.id;
  if (!coverLetterId) throw new Error("saveCoverLetterDetail: coverLetter.id가 필요합니다.");

  const existing = await getCoverLetterRepository().findById(coverLetterId);
  if (!existing) throw new Error("saveCoverLetterDetail: 자기소개서를 찾을 수 없습니다.");

  await getCoverLetterRepository().update(coverLetterId, {
    ...input.coverLetter,
    version: (existing.version ?? 1) + 1,
  });

  await getCoverLetterSectionRepository().replaceSections(coverLetterId, input.sections);

  const allFilled = input.sections.every((s) => (s.content ?? "").trim().length > 0);
  await getCoverLetterRepository().update(coverLetterId, { status: allFilled ? "completed" : "draft" });

  await logActivityEvent({
    userId: existing.userId,
    eventType: "cover_letter_updated",
    entityType: "cover_letter",
    entityId: coverLetterId,
  });
  await recalculateLeadScore(existing.userId);

  return (await getCoverLetterDetail(coverLetterId))!;
}

export async function deleteCoverLetter(coverLetterId: string): Promise<void> {
  await getCoverLetterRepository().remove(coverLetterId);
}
