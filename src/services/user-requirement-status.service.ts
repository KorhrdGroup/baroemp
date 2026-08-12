import {
  findCareerProfileByUserId,
  getUserQualificationRepository,
  getUserSkillRepository,
} from "@/lib/repositories";
import { listResumesForUser, getResumeDetail } from "./resume.service";
import { listExperienceBankForUser } from "./experience-bank.service";
import { namesMatchRequirement, textMentionsRequirement } from "@/lib/career-gap/requirement-normalizer";
import type { CareerGapRequirement, ResumeDetail, ResumeExperience, ResumeQualification, ResumeSkill, ResumeGapNote, UserRequirementStatus } from "@/types";

export interface UserRequirementStatusResult {
  status: UserRequirementStatus;
  resumeGapNote?: ResumeGapNote;
}

interface UserCareerSnapshot {
  canDrive?: boolean;
  careerYears?: number;
  interestTags: string[];
  userQualificationNames: string[];
  userSkillNames: string[];
  resumeQualifications: ResumeQualification[];
  resumeSkills: ResumeSkill[];
  resumeExperiences: ResumeExperience[];
  experienceBankText: string;
  hasAnyExperienceSignal: boolean;
}

/** 회원의 Career Identity(Qualifications/Skills/Resume/Career Profile/Experience)를 한 번에 모은다 (스펙 13번). */
export async function loadUserCareerSnapshot(userId: string): Promise<UserCareerSnapshot> {
  const [careerProfile, userQualifications, userSkills, resumes, experienceBankItems] = await Promise.all([
    findCareerProfileByUserId(userId),
    getUserQualificationRepository().findByUserId(userId),
    getUserSkillRepository().findByUserId(userId),
    listResumesForUser(userId),
    listExperienceBankForUser(userId),
  ]);

  const primaryResume = resumes.find((r) => r.isPrimary) ?? resumes[0];
  let resumeDetail: ResumeDetail | null = null;
  if (primaryResume) resumeDetail = await getResumeDetail(primaryResume.id);

  const experienceBankText = experienceBankItems
    .map((item) => [item.title, item.situation, item.task, item.action, item.result].filter(Boolean).join(" "))
    .join("\n");

  return {
    canDrive: careerProfile?.canDrive,
    careerYears: careerProfile?.careerYears,
    interestTags: careerProfile?.interestTags ?? [],
    userQualificationNames: userQualifications.map((q) => q.name),
    userSkillNames: userSkills.map((s) => s.name),
    resumeQualifications: resumeDetail?.qualifications ?? [],
    resumeSkills: resumeDetail?.skills ?? [],
    resumeExperiences: resumeDetail?.experiences ?? [],
    experienceBankText,
    hasAnyExperienceSignal:
      (resumeDetail?.experiences.length ?? 0) > 0 || experienceBankItems.length > 0 || (careerProfile?.careerYears ?? 0) > 0,
  };
}

function resumeExperienceText(experiences: ResumeExperience[]): string {
  return experiences.map((e) => [e.jobTitle, e.position, e.responsibilities, e.achievements].filter(Boolean).join(" ")).join("\n");
}

/**
 * Requirement 하나에 대한 사용자 충족 상태를 계산한다.
 * AI가 판단하지 않고 matchingType별 결정론적 Rule로만 계산한다 (스펙 49번).
 */
function evaluateRequirement(requirement: CareerGapRequirement, snapshot: UserCareerSnapshot): UserRequirementStatusResult {
  const resumeExpText = resumeExperienceText(snapshot.resumeExperiences);

  if (requirement.matchingType === "DRIVING_FLAG") {
    if (snapshot.canDrive === true) return { status: "SATISFIED" };
    if (snapshot.canDrive === false) return { status: "NOT_SATISFIED" };
    return { status: "UNKNOWN" };
  }

  if (requirement.matchingType === "QUALIFICATION") {
    const resumeNames = snapshot.resumeQualifications.map((q) => q.name);
    const matchedInResume = namesMatchRequirement(resumeNames, requirement);
    const matchedInCareerDb = namesMatchRequirement(snapshot.userQualificationNames, requirement);
    if (matchedInResume || matchedInCareerDb) {
      const note: ResumeGapNote | undefined =
        matchedInCareerDb && !matchedInResume
          ? {
              requirementId: requirement.id,
              requirementName: requirement.name,
              kind: "ABILITY_EXISTS_BUT_NOT_EXPRESSED",
              message: `보유하신 '${requirement.name}' 자격이 이력서에는 반영되어 있지 않습니다. 이력서 자격 항목에도 추가해보세요.`,
            }
          : undefined;
      return { status: "SATISFIED", resumeGapNote: note };
    }
    if (resumeNames.length > 0 || snapshot.userQualificationNames.length > 0) return { status: "NOT_SATISFIED" };
    return { status: "UNKNOWN" };
  }

  if (requirement.matchingType === "SKILL_KEYWORD") {
    const resumeSkillNames = snapshot.resumeSkills.map((s) => s.name);
    const careerSkillNames = [...snapshot.userSkillNames, ...snapshot.interestTags];
    const matchedInResume = namesMatchRequirement(resumeSkillNames, requirement) || textMentionsRequirement(resumeExpText, requirement);
    const matchedInCareerDb = namesMatchRequirement(careerSkillNames, requirement);
    if (matchedInResume || matchedInCareerDb) {
      const note: ResumeGapNote | undefined =
        matchedInCareerDb && !matchedInResume
          ? {
              requirementId: requirement.id,
              requirementName: requirement.name,
              kind: "ABILITY_EXISTS_BUT_NOT_EXPRESSED",
              message: `'${requirement.name}' 관련 역량은 있지만 이력서에는 충분히 드러나지 않습니다.`,
            }
          : undefined;
      return { status: "SATISFIED", resumeGapNote: note };
    }
    if (resumeSkillNames.length > 0 || careerSkillNames.length > 0) return { status: "NOT_SATISFIED" };
    return { status: "UNKNOWN" };
  }

  // EXPERIENCE_TEXT
  const matchedInResume = textMentionsRequirement(resumeExpText, requirement);
  if (matchedInResume) return { status: "SATISFIED" };

  const matchedInBank = textMentionsRequirement(snapshot.experienceBankText, requirement);
  if (matchedInBank) {
    return {
      status: "SATISFIED",
      resumeGapNote: {
        requirementId: requirement.id,
        requirementName: requirement.name,
        kind: "ABILITY_EXISTS_BUT_NOT_EXPRESSED",
        message: `'${requirement.name}' 관련 경험을 기록해두셨지만 이력서에는 충분히 드러나지 않습니다.`,
      },
    };
  }

  if (snapshot.hasAnyExperienceSignal) {
    return {
      status: "CHECK_REQUIRED",
      resumeGapNote: {
        requirementId: requirement.id,
        requirementName: requirement.name,
        kind: "ABILITY_EXISTS_BUT_NOT_EXPRESSED",
        message: `관련 경험이 있을 수 있지만 이력서에서 '${requirement.name}' 관련 내용을 확인하기 어렵습니다. 직접 확인해주세요.`,
      },
    };
  }

  return { status: "UNKNOWN" };
}

export async function computeUserRequirementStatuses(
  userId: string,
  requirements: CareerGapRequirement[],
): Promise<Map<string, UserRequirementStatusResult>> {
  const snapshot = await loadUserCareerSnapshot(userId);
  const result = new Map<string, UserRequirementStatusResult>();
  for (const requirement of requirements) {
    result.set(requirement.id, evaluateRequirement(requirement, snapshot));
  }
  return result;
}
