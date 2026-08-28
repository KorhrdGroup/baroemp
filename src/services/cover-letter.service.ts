import type {
  CoverLetter,
  CoverLetterDetail,
  CoverLetterDetailSaveInput,
  CoverLetterTemplateQuestion,
} from "@/types";
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

/**
 * 한 회원이 가질 수 있는 자기소개서 수.
 * 공고마다 하나씩 쓰는 문서라 이력서보다 넉넉히 둔다. 이유는 이력서와 같다(화면).
 */
export const MAX_COVER_LETTERS_PER_USER = 20;

export const COVER_LETTER_LIMIT_MESSAGE = `자기소개서는 ${MAX_COVER_LETTERS_PER_USER}개까지 만들 수 있어요. 쓰지 않는 자기소개서를 지우고 다시 시도해주세요.`;

export async function createCoverLetterFromTemplate(params: {
  userId: string;
  templateId: string;
  title?: string;
  resumeId?: string;
  targetJobId?: string;
  targetOccupationId?: string;
  /**
   * 작성 시작 화면에서 직접 고른 문항. 넘기지 않으면 양식의 기본 문항을 그대로 쓴다.
   * 고른 문항은 양식에 없는 것이 섞일 수 있어(직접 입력) 양식 문항으로 되돌려 찾지 않는다.
   */
  questions?: CoverLetterTemplateQuestion[];
  /** 작성 시작 화면에서 고른 재료 경험. 편집 화면에서 AI 초안 후보로 쓴다. */
  experienceBankIds?: string[];
}): Promise<CoverLetterDetail> {
  const existing = await listCoverLettersForUser(params.userId);
  if (existing.length >= MAX_COVER_LETTERS_PER_USER) throw new Error(COVER_LETTER_LIMIT_MESSAGE);

  const template = await getCoverLetterTemplateRepository().findById(params.templateId);

  const coverLetter = await getCoverLetterRepository().create({
    userId: params.userId,
    // 제목은 사용자가 직접 입력한다. 공고 등에서 넘어온 제목만 미리 채우고, 그 외에는 비워 둔다.
    title: params.title?.trim() ?? "",
    templateId: params.templateId,
    resumeId: params.resumeId,
    targetJobId: params.targetJobId,
    targetOccupationId: params.targetOccupationId,
    experienceBankIds: params.experienceBankIds ?? [],
    status: "draft",
  });

  const questions = params.questions?.length ? params.questions : (template?.defaultQuestions ?? []);
  await getCoverLetterSectionRepository().replaceSections(
    coverLetter.id,
    questions.map((q, i) => ({
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
