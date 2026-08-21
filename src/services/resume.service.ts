import type {
  Resume,
  ResumeDetail,
  ResumeDetailSaveInput,
  ResumeChangeType,
  ResumeSnapshot,
} from "@/types";
import {
  findCareerProfileByUserId,
  getJobRepository,
  getProfileRepository,
  getResumeDetailRepository,
  getResumeRepository,
  getResumeTemplateRepository,
  getResumeVersionRepository,
  getUserQualificationRepository,
  getUserSkillRepository,
} from "@/lib/repositories";
import { calculateResumeCompleteness } from "@/lib/resume/completeness";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { recalculateLeadScore } from "./lead-score.service";
import { mergeResumeToCareerProfile } from "./resume-career-merge.service";
import { labelRegion } from "@/lib/labels";

/** 이력서 목록 (본인 소유). 최근 수정순으로 정렬한다. */
export async function listResumesForUser(userId: string): Promise<Resume[]> {
  const resumes = await getResumeRepository().findAll({ userId });
  return [...resumes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getResumeDetail(resumeId: string): Promise<ResumeDetail | null> {
  const resume = await getResumeRepository().findById(resumeId);
  if (!resume) return null;
  const [children, template] = await Promise.all([
    getResumeDetailRepository().getDetailChildren(resumeId),
    resume.templateId ? getResumeTemplateRepository().findById(resume.templateId) : Promise.resolve(null),
  ]);
  return { resume, template: template ?? undefined, ...children };
}

/**
 * Career DB에서 지금 가능한 항목만 prefill한다 (스펙 19번).
 * 이름/전화/이메일/지역/자격/스킬은 이미 갖고 있으면 그대로 채우고,
 * 경력/학력처럼 아직 Career DB에 구조화되어 있지 않은 항목은 사용자가 새로 입력하게 한다.
 */
async function buildPrefill(userId: string, targetJobId?: string) {
  const [profile, careerProfile, heldQualifications, heldSkills, job] = await Promise.all([
    getProfileRepository().findById(userId),
    findCareerProfileByUserId(userId),
    getUserQualificationRepository().findByUserId(userId),
    getUserSkillRepository().findByUserId(userId),
    targetJobId ? getJobRepository().findById(targetJobId) : Promise.resolve(null),
  ]);

  return {
    name: profile?.name,
    email: profile?.email,
    phone: profile?.phone,
    address: careerProfile?.region ? labelRegion(careerProfile.region) : profile?.regionSido,
    desiredRegion: careerProfile?.region,
    desiredJobTitle: job?.title ?? careerProfile?.desiredJobCategories?.[0],
    targetOccupationId: undefined as string | undefined,
    qualifications: heldQualifications.map((q, i) => ({ name: q.name, orderIndex: i })),
    skills: heldSkills.map((s, i) => ({ name: s.name, orderIndex: i })),
  };
}

export async function createResumeFromTemplate(params: {
  userId: string;
  templateId: string;
  title?: string;
  targetJobId?: string;
  targetOccupationId?: string;
}): Promise<ResumeDetail> {
  const { userId, templateId, targetJobId, targetOccupationId } = params;
  const template = await getResumeTemplateRepository().findById(templateId);
  const prefill = await buildPrefill(userId, targetJobId);

  const existing = await listResumesForUser(userId);
  const isFirstResume = existing.length === 0;

  const resume = await getResumeRepository().create({
    userId,
    templateId,
    title: params.title?.trim() || `${template?.name ?? "새"} 이력서`,
    targetJobId,
    targetOccupationId: targetOccupationId ?? prefill.targetOccupationId,
    desiredJobTitle: prefill.desiredJobTitle,
    desiredRegion: prefill.desiredRegion,
    name: prefill.name,
    email: prefill.email,
    phone: prefill.phone,
    address: prefill.address,
    status: "draft",
    isPrimary: isFirstResume,
  });

  const detailRepo = getResumeDetailRepository();
  await Promise.all([
    detailRepo.replaceQualifications(resume.id, prefill.qualifications),
    detailRepo.replaceSkills(resume.id, prefill.skills),
  ]);

  await logActivityEvent({
    userId,
    eventType: "resume_created",
    entityType: "resume",
    entityId: resume.id,
    metadata: { templateCode: template?.code },
  });
  await logActivityEvent({
    userId,
    eventType: "resume_template_selected",
    entityType: "resume",
    entityId: resume.id,
    metadata: { templateCode: template?.code },
  });
  if (targetJobId) {
    await logActivityEvent({
      userId,
      eventType: "target_job_selected",
      entityType: "resume",
      entityId: resume.id,
      metadata: { jobId: targetJobId },
    });
  }
  await recalculateLeadScore(userId);

  const detail = await getResumeDetail(resume.id);
  return detail!;
}

function buildSnapshot(detail: ResumeDetail): ResumeSnapshot {
  const { resume, educations, experiences, qualifications, trainings, skills, items } = detail;
  const { createdAt, updatedAt, ...resumeWithoutTimestamps } = resume;
  void createdAt;
  void updatedAt;
  return { resume: resumeWithoutTimestamps, educations, experiences, qualifications, trainings, skills, items };
}

/**
 * Resume Builder 편집 화면에서 저장 버튼을 누르면 호출된다.
 * header + 하위 항목을 통째로 교체하고, 완성도를 재계산하고, 버전 snapshot을 남긴 뒤
 * Career DB Merge Service를 호출해 새로 입력된 자격/스킬을 Career Identity에 반영한다.
 */
export async function saveResumeDetail(
  input: ResumeDetailSaveInput,
  options: { changeType?: ResumeChangeType } = {},
): Promise<ResumeDetail> {
  const resumeId = input.resume.id;
  if (!resumeId) throw new Error("saveResumeDetail: resume.id가 필요합니다.");

  const existing = await getResumeRepository().findById(resumeId);
  if (!existing) throw new Error("saveResumeDetail: 이력서를 찾을 수 없습니다.");

  if (input.resume.isPrimary) {
    await getResumeRepository().clearOtherPrimary(existing.userId, resumeId);
  }

  await getResumeRepository().update(resumeId, {
    ...input.resume,
    version: (existing.version ?? 1) + 1,
  });

  const detailRepo = getResumeDetailRepository();
  await Promise.all([
    detailRepo.replaceEducations(resumeId, input.educations),
    detailRepo.replaceExperiences(resumeId, input.experiences),
    detailRepo.replaceQualifications(resumeId, input.qualifications),
    detailRepo.replaceTrainings(resumeId, input.trainings),
    detailRepo.replaceSkills(resumeId, input.skills),
    detailRepo.replaceItems(resumeId, input.items),
  ]);

  let detail = (await getResumeDetail(resumeId))!;
  const completenessResult = calculateResumeCompleteness(detail);
  const nextStatus = completenessResult.score >= 80 && detail.resume.status === "draft" ? "completed" : detail.resume.status;

  await getResumeRepository().update(resumeId, {
    completeness: completenessResult.score,
    status: nextStatus,
  });
  detail = (await getResumeDetail(resumeId))!;

  await getResumeVersionRepository().create({
    resumeId,
    version: detail.resume.version,
    snapshot: buildSnapshot(detail),
    changeType: options.changeType ?? "MANUAL",
  });

  await logActivityEvent({
    userId: detail.resume.userId,
    eventType: "resume_updated",
    entityType: "resume",
    entityId: resumeId,
    metadata: { completeness: completenessResult.score },
  });
  if (nextStatus === "completed" && existing.status !== "completed") {
    await logActivityEvent({
      userId: detail.resume.userId,
      eventType: "resume_completed",
      entityType: "resume",
      entityId: resumeId,
      metadata: { completeness: completenessResult.score },
    });
  }

  await mergeResumeToCareerProfile(resumeId);
  await recalculateLeadScore(detail.resume.userId);

  return (await getResumeDetail(resumeId))!;
}

export async function deleteResume(resumeId: string): Promise<void> {
  const resume = await getResumeRepository().findById(resumeId);
  if (!resume) return;
  await getResumeDetailRepository().removeAllForResume(resumeId);
  await getResumeRepository().remove(resumeId);
}

export async function listResumeVersions(resumeId: string) {
  return getResumeVersionRepository().listByResume(resumeId);
}

/**
 * 이력서 양식 변경.
 * 이력서에서 템플릿은 "어떤 섹션을 노출할지"만 결정하고 입력된 내용은 그대로 남으므로,
 * 작성 도중 언제든 바꿔도 데이터가 사라지지 않는다.
 */
export async function changeResumeTemplate(resumeId: string, templateId: string): Promise<ResumeDetail | null> {
  const updated = await getResumeRepository().update(resumeId, { templateId });
  if (!updated) return null;
  const template = await getResumeTemplateRepository().findById(templateId);
  await logActivityEvent({
    userId: updated.userId,
    eventType: "resume_template_selected",
    entityType: "resume",
    entityId: resumeId,
    metadata: { templateCode: template?.code },
  });
  return getResumeDetail(resumeId);
}
