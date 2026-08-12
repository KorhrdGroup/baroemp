import type { ISODateString } from "./common";

/**
 * Resume: 이력서 Builder 도메인 (STEP 7).
 *
 * STEP 1에서는 "업로드 후 AI 첨삭" mock 전용 구조였지만, 실사용 데이터가 없던 테이블을
 * 그대로 확장해 이번 STEP의 핵심 Resume Builder 도메인으로 승격했다.
 * 사용자는 여러 개의 Resume를 가질 수 있고(예: 사회복지사용/사무직용), 각 Resume는
 * ResumeTemplate 하나를 참조해 어떤 섹션을 어떤 순서로 보여줄지 결정한다.
 */
export type ResumeStatus = "draft" | "completed" | "archived";

/** 관리자가 Template을 추가할 수 있으므로 코드에 값을 하드코딩하지 않고 열어둔다. */
export type ResumeSectionCode =
  | "BASIC_INFO"
  | "SUMMARY"
  | "EXPERIENCE"
  | "EDUCATION"
  | "QUALIFICATION"
  | "TRAINING"
  | "SKILLS"
  | "PROJECT"
  | "ACTIVITY"
  | (string & {});

export interface ResumeTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  targetType: string;
  sections: ResumeSectionCode[];
  status: "active" | "inactive";
  orderIndex: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type ResumeTemplateInput = Partial<Omit<ResumeTemplate, "id" | "createdAt" | "updatedAt">> & {
  code: string;
  name: string;
};

export interface Resume {
  id: string;
  userId: string;
  templateId?: string;
  title: string;
  targetJobId?: string;
  targetOccupationId?: string;
  summary?: string;
  desiredJobTitle?: string;
  desiredRegion?: string;
  status: ResumeStatus;
  isPrimary: boolean;
  version: number;
  completeness: number;

  /** 기본정보 (Career DB에서 prefill되나, 이력서별로 다르게 수정 가능) */
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  photoUrl?: string;
  portfolioUrl?: string;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type ResumeInput = Partial<Omit<Resume, "id" | "userId" | "createdAt" | "updatedAt">> & {
  userId: string;
  title: string;
};

export interface ResumeEducation {
  id: string;
  resumeId: string;
  schoolName: string;
  educationType?: string;
  major?: string;
  degree?: string;
  admissionDate?: string;
  graduationDate?: string;
  graduationStatus?: string;
  description?: string;
  orderIndex: number;
}
export type ResumeEducationInput = Partial<Omit<ResumeEducation, "id" | "resumeId">> & { schoolName: string };

export interface ResumeExperience {
  id: string;
  resumeId: string;
  companyName: string;
  department?: string;
  position?: string;
  employmentType?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  jobTitle?: string;
  /** "어떤 일을 하셨나요?" - 자유 서술형. UI에서 예시(고객상담/거래처관리 등)를 제공한다. */
  responsibilities?: string;
  /** "기억나는 성과가 있나요?" - 숫자 없어도 저장 가능. */
  achievements?: string;
  reasonForLeaving?: string;
  orderIndex: number;
}
export type ResumeExperienceInput = Partial<Omit<ResumeExperience, "id" | "resumeId" | "isCurrent">> & {
  companyName: string;
  isCurrent?: boolean;
};

export interface ResumeQualification {
  id: string;
  resumeId: string;
  name: string;
  issuer?: string;
  acquiredAt?: string;
  licenseNumber?: string;
  expiresAt?: string;
  /** Career DB Merge Service가 채워주는 역참조. 사용자가 직접 지정하지 않는다. */
  userQualificationId?: string;
  orderIndex: number;
}
export type ResumeQualificationInput = Partial<Omit<ResumeQualification, "id" | "resumeId" | "userQualificationId">> & {
  name: string;
};

export interface ResumeTraining {
  id: string;
  resumeId: string;
  courseName: string;
  institution?: string;
  startDate?: string;
  endDate?: string;
  content?: string;
  orderIndex: number;
}
export type ResumeTrainingInput = Partial<Omit<ResumeTraining, "id" | "resumeId">> & { courseName: string };

export interface ResumeSkill {
  id: string;
  resumeId: string;
  name: string;
  orderIndex: number;
}
export type ResumeSkillInput = Partial<Omit<ResumeSkill, "id" | "resumeId">> & { name: string };

/** 수상/프로젝트/대외활동/봉사/외국어 등 선택 항목. 강제하지 않는 부가 섹션. */
export type ResumeItemSectionType = "AWARD" | "PROJECT" | "ACTIVITY" | "VOLUNTEER" | "LANGUAGE";
export interface ResumeItem {
  id: string;
  resumeId: string;
  sectionType: ResumeItemSectionType;
  title: string;
  organization?: string;
  periodStart?: string;
  periodEnd?: string;
  description?: string;
  orderIndex: number;
}
export type ResumeItemInput = Partial<Omit<ResumeItem, "id" | "resumeId">> & {
  sectionType: ResumeItemSectionType;
  title: string;
};

export type ResumeChangeType = "MANUAL" | "AI_REVIEW" | "AI_REWRITE" | "IMPORT";
export interface ResumeVersion {
  id: string;
  resumeId: string;
  version: number;
  snapshot: ResumeSnapshot;
  changeType: ResumeChangeType;
  createdAt: ISODateString;
}

/** 특정 시점의 이력서 전체 내용을 복원할 수 있게 담아두는 snapshot 구조. */
export interface ResumeSnapshot {
  resume: Omit<Resume, "createdAt" | "updatedAt">;
  educations: ResumeEducation[];
  experiences: ResumeExperience[];
  qualifications: ResumeQualification[];
  trainings: ResumeTraining[];
  skills: ResumeSkill[];
  items: ResumeItem[];
}

/** Resume Builder 화면(편집/미리보기)에서 사용하는 이력서 전체 데이터 묶음. */
export interface ResumeDetail {
  resume: Resume;
  educations: ResumeEducation[];
  experiences: ResumeExperience[];
  qualifications: ResumeQualification[];
  trainings: ResumeTraining[];
  skills: ResumeSkill[];
  items: ResumeItem[];
  template?: ResumeTemplate;
}

/** 이력서 저장 시 header + 하위 항목을 한 번에 갱신하기 위한 입력 묶음. */
export interface ResumeDetailSaveInput {
  resume: ResumeInput & { id?: string };
  educations: ResumeEducationInput[];
  experiences: ResumeExperienceInput[];
  qualifications: ResumeQualificationInput[];
  trainings: ResumeTrainingInput[];
  skills: ResumeSkillInput[];
  items: ResumeItemInput[];
}

/** 완성도 계산 결과. Lead Score와 혼동하지 않도록 완전히 별도 타입으로 둔다. */
export interface ResumeCompletenessResult {
  score: number;
  missing: { section: ResumeSectionCode; label: string }[];
}
