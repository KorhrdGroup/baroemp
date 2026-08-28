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

/*
  항목 이름. 작성 시작 화면, 편집 화면의 항목 목록, 완성도의 "다음: OO" 가 모두 이 표를 쓴다.
  화면마다 따로 적어두면 같은 항목이 "보유자격"과 "보유 자격"으로 갈린다.
*/
const SECTION_LABELS: Record<string, string> = {
  BASIC_INFO: "기본정보",
  SUMMARY: "핵심 경력 / 한 줄 소개",
  EXPERIENCE: "경력",
  EDUCATION: "학력",
  QUALIFICATION: "보유 자격",
  SKILLS: "보유 스킬",
  TRAINING: "교육/훈련",
  PROJECT: "프로젝트",
  ACTIVITY: "봉사·수상 등 추가 경력",
};

/** 이 이력서가 담기로 한 항목. 고른 것이 없으면 양식이 정한 항목을 따른다. */
export function resolveResumeSections(detail: ResumeDetail): ResumeSectionCode[] {
  if (detail.resume.sectionCodes?.length) return detail.resume.sectionCodes;
  if (detail.template?.sections?.length) return detail.template.sections;
  return Object.keys(SECTION_WEIGHTS) as ResumeSectionCode[];
}

/** 항목 이름. 편집 화면의 항목 목록과 완성도가 같은 이름을 쓴다. */
export function resumeSectionLabel(section: ResumeSectionCode): string {
  return SECTION_LABELS[section as string] ?? String(section);
}

/** 완성도에 세는 항목인가. 세지 않는 항목은 안 채워도 완성도가 깎이지 않는다. */
export function isRequiredSection(section: ResumeSectionCode): boolean {
  return (SECTION_WEIGHTS[section as string] ?? 0) > 0;
}

/**
 * 편집 화면의 "봉사·수상 등 추가 경력" 카드 하나가 이 두 항목을 함께 받는다.
 * 그래서 고르는 목록에서도 한 줄로 합쳐 보여준다 - 따로 두면 프로젝트를 담아도
 * 화면에 아무 변화가 없어 눌러도 안 먹는 것처럼 보인다.
 */
export const EXTRA_SECTION_CODES: ResumeSectionCode[] = ["PROJECT", "ACTIVITY"];

export interface ResumeSectionOption {
  /** 담을 때 이력서에 저장하는 코드 */
  code: ResumeSectionCode;
  /** 이 한 줄이 함께 다루는 코드. 대부분 자기 자신 하나뿐이다. */
  codes: ResumeSectionCode[];
  label: string;
  required: boolean;
}

/**
 * 담을 수 있는 항목 목록.
 *
 * 양식들의 항목을 모두 모아 중복만 없앤다. 양식별로 나눠 보여주면 "내 양식에 없는
 * 항목은 못 담나" 하고 멈춘다. 작성 시작 화면과 편집 화면이 같은 목록을 쓴다.
 */
export function buildResumeSectionOptions(
  templates: { sections: ResumeSectionCode[] }[],
): ResumeSectionOption[] {
  const options: ResumeSectionOption[] = [];

  for (const code of templates.flatMap((t) => t.sections)) {
    const isExtra = EXTRA_SECTION_CODES.includes(code);
    const key = isExtra ? "ACTIVITY" : code;
    if (options.some((o) => o.code === key)) continue;
    options.push({
      code: key,
      codes: isExtra ? EXTRA_SECTION_CODES : [code],
      label: resumeSectionLabel(key),
      required: isRequiredSection(key),
    });
  }

  return options;
}

export function isSectionFilled(section: ResumeSectionCode, detail: ResumeDetail): boolean {
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
  const weighted = resolveResumeSections(detail)
    .map((section) => ({ section, weight: SECTION_WEIGHTS[section as string] ?? 0 }))
    .filter((s) => s.weight > 0);

  const totalWeight = weighted.reduce((sum, s) => sum + s.weight, 0) || 1;
  const missing: { section: ResumeSectionCode; label: string }[] = [];

  let filledWeight = 0;
  for (const { section, weight } of weighted) {
    if (isSectionFilled(section, detail)) {
      filledWeight += weight;
    } else {
      missing.push({ section, label: resumeSectionLabel(section) });
    }
  }

  const score = Math.round((filledWeight / totalWeight) * 100);
  return { score, missing };
}
