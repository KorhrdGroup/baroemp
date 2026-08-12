import {
  findCareerProfileByUserId,
  getCareerProfileRepository,
  getResumeDetailRepository,
  getResumeRepository,
  getUserQualificationRepository,
  getUserSkillRepository,
} from "@/lib/repositories";

/**
 * Resume → Career Profile Merge Service (스펙 22/50번).
 *
 * 이력서에 새로 입력된 자격/스킬을 Career Identity(user_qualifications/user_skills)에 반영한다.
 * 원칙:
 * - 이력서 내용을 Career Profile에 "무조건 덮어쓰지" 않는다 (career_years처럼 비어있는 값만 보강).
 * - Resume가 삭제돼도 Career DB의 자격/스킬은 자동 삭제되지 않는다 (강결합 금지) - 그래서
 *   resume_qualifications -> user_qualifications는 FK on delete set null 이고, user_qualifications
 *   row 자체는 그대로 유지된다.
 * - source='RESUME'로 provenance를 남겨, 관리자가 "이 자격은 어디서 왔는지" 구분할 수 있게 한다.
 */
export async function mergeResumeToCareerProfile(resumeId: string): Promise<void> {
  const resume = await getResumeRepository().findById(resumeId);
  if (!resume) return;

  const detailRepo = getResumeDetailRepository();
  const { qualifications, experiences } = await detailRepo.getDetailChildren(resumeId);

  const qualificationRepo = getUserQualificationRepository();
  for (const q of qualifications) {
    if (!q.name.trim()) continue;
    const merged = await qualificationRepo.upsertFromResume({
      userId: resume.userId,
      name: q.name,
      acquiredAt: q.acquiredAt,
      expiresAt: q.expiresAt,
      sourceResumeId: resumeId,
    });
    if (merged.id !== q.userQualificationId) {
      await detailRepo.setQualificationLink(q.id, merged.id);
    }
  }

  const skillRepo = getUserSkillRepository();
  const { skills } = await detailRepo.getDetailChildren(resumeId);
  for (const s of skills) {
    if (!s.name.trim()) continue;
    await skillRepo.upsertFromResume({ userId: resume.userId, name: s.name, sourceResumeId: resumeId });
  }

  await enrichCareerYears(resume.userId, experiences);
}

/** career_profiles.career_years가 비어있을 때만, 이력서 경력의 재직기간 합계로 보강한다. */
async function enrichCareerYears(
  userId: string,
  experiences: { startDate?: string; endDate?: string; isCurrent: boolean }[],
): Promise<void> {
  const careerProfile = await findCareerProfileByUserId(userId);
  if (!careerProfile || careerProfile.careerYears) return;
  if (experiences.length === 0) return;

  let totalMonths = 0;
  const now = new Date();
  for (const exp of experiences) {
    if (!exp.startDate) continue;
    const start = new Date(exp.startDate);
    const end = exp.isCurrent || !exp.endDate ? now : new Date(exp.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) continue;
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    totalMonths += Math.max(0, months);
  }
  if (totalMonths === 0) return;

  const careerYears = Math.round((totalMonths / 12) * 10) / 10;
  await getCareerProfileRepository().update(careerProfile.id, { careerYears });
}
