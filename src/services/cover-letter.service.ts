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

/**
 * 자기소개서 양식 변경.
 * 자기소개서에서 템플릿은 문항 세트 자체를 정의하므로 교체하면 문항이 통째로 바뀐다.
 * 이미 쓴 답변이 사라지지 않도록, 같은 questionType의 답변은 새 문항으로 옮겨 담는다.
 * 새 양식에 없는 문항의 답변은 유지할 자리가 없어 사라지므로 호출부에서 반드시 확인을 받는다.
 */
export async function changeCoverLetterTemplate(
  coverLetterId: string,
  templateId: string,
): Promise<CoverLetterDetail | null> {
  const current = await getCoverLetterDetail(coverLetterId);
  if (!current) return null;

  const template = await getCoverLetterTemplateRepository().findById(templateId);
  const defaultQuestions = template?.defaultQuestions ?? [];

  // questionType이 같은 기존 답변을 새 문항에 옮겨 담는다.
  const contentByType = new Map<string, string>();
  for (const section of current.sections) {
    if (section.content?.trim()) contentByType.set(section.questionType, section.content);
  }

  await getCoverLetterRepository().update(coverLetterId, { templateId });
  await getCoverLetterSectionRepository().replaceSections(
    coverLetterId,
    defaultQuestions.map((q, i) => ({
      questionType: q.questionType,
      question: q.question,
      content: contentByType.get(q.questionType) ?? "",
      characterLimit: q.characterLimit,
      orderIndex: i,
    })),
  );

  await logActivityEvent({
    userId: current.coverLetter.userId,
    // 전용 이벤트 타입을 새로 만들지 않는다. ACTIVITY_EVENT_TYPES에 없는 값을 넣으면
    // 분석 쿼리와 DB 제약에서 걸린다. 양식 변경은 metadata로 구분한다.
    eventType: "cover_letter_updated",
    entityType: "cover_letter",
    entityId: coverLetterId,
    metadata: { action: "template_changed", templateCode: template?.code },
  });

  return getCoverLetterDetail(coverLetterId);
}
