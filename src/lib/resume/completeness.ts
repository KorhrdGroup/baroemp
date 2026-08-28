import type { ResumeDetail, ResumeCompletenessResult, ResumeSectionCode } from "@/types";

/**
 * Resume Completeness Score 계산 (스펙 21번).
 * Lead Score와 완전히 별개의 축이다 - "영업 가능성"이 아니라 "이 이력서 자체가 얼마나 채워졌는지"를 나타낸다.
 *
 * Template에 포함된 section만 가중치를 부여한다 (예: CARE_WELFARE Template에 PROJECT가 없으면
 * 프로젝트를 안 채웠다고 완성도를 깎지 않는다).
 */
const SECTION_WEIGHTS: Record<string, number> = {
  BASIC_INFO: 20,
  SUMMARY: 15,
  EXPERIENCE: 25,
  EDUCATION: 15,
  QUALIFICATION: 10,
  SKILLS: 10,
  TRAINING: 5,
  PROJECT: 0,
  ACTIVITY: 0,
};

const SECTION_LABELS: Record<string, string> = {
  BASIC_INFO: "기본정보",
  SUMMARY: "핵심경력 요약",
  EXPERIENCE: "경력 담당업무",
  EDUCATION: "학력",
  QUALIFICATION: "보유자격",
  SKILLS: "보유스킬",
  TRAINING: "교육/훈련",
  PROJECT: "프로젝트",
  ACTIVITY: "대외활동",
};

function isSectionFilled(section: ResumeSectionCode, detail: ResumeDetail): boolean {
  const { resume, experiences, educations, qualifications, skills } = detail;
  switch (section) {
    case "BASIC_INFO":
      return Boolean(resume.name && resume.email && resume.phone);
    case "SUMMARY":
      return Boolean(resume.summary && resume.summary.trim().length >= 5);
    case "EXPERIENCE":
      // 경력이 없다고 밝힌 것도 답을 한 것이다. 그렇지 않으면 경력이 없는
      // 회원은 완성도를 끝까지 올릴 방법이 없다.
      if (resume.hasNoWorkExperience) return true;
      return experiences.length > 0 && experiences.every((e) => Boolean(e.responsibilities && e.responsibilities.trim()));
    case "EDUCATION":
      return educations.length > 0;
    case "QUALIFICATION":
      return qualifications.length > 0;
    case "SKILLS":
      return skills.length > 0;
    case "TRAINING":
      return detail.trainings.length > 0;
    default:
      return true;
  }
}

export function calculateResumeCompleteness(detail: ResumeDetail): ResumeCompletenessResult {
  const sections = detail.template?.sections?.length
    ? detail.template.sections
    : (Object.keys(SECTION_WEIGHTS) as ResumeSectionCode[]);

  const weighted = sections
    .map((section) => ({ section, weight: SECTION_WEIGHTS[section as string] ?? 0 }))
    .filter((s) => s.weight > 0);

  const totalWeight = weighted.reduce((sum, s) => sum + s.weight, 0) || 1;
  const missing: { section: ResumeSectionCode; label: string }[] = [];

  let filledWeight = 0;
  for (const { section, weight } of weighted) {
    if (isSectionFilled(section, detail)) {
      filledWeight += weight;
    } else {
      missing.push({ section, label: SECTION_LABELS[section as string] ?? String(section) });
    }
  }

  const score = Math.round((filledWeight / totalWeight) * 100);
  return { score, missing };
}
