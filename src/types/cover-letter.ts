import type { ISODateString } from "./common";

/**
 * Cover Letter: 자기소개서 Builder 도메인 (STEP 7 신규).
 * Resume와 마찬가지로 여러 개를 가질 수 있고, target Job에 맞춰 별도로 작성할 수 있다.
 */
export type CoverLetterStatus = "draft" | "completed" | "archived";

/** 관리자가 문항 유형을 자유롭게 추가할 수 있으므로 폐쇄 enum으로 두지 않는다. */
export type CoverLetterQuestionType =
  | "MOTIVATION"
  | "EXPERIENCE"
  | "STRENGTH"
  | "PROBLEM_SOLVING"
  | "ASPIRATION"
  | "JOB_FIT"
  | "FIELD_INTEREST"
  | "INTERPERSONAL"
  | "CONFLICT_HANDLING"
  | "RESPONSIBILITY"
  | "CONTRIBUTION"
  | (string & {});

export interface CoverLetterTemplateQuestion {
  questionType: CoverLetterQuestionType;
  question: string;
  characterLimit?: number;
}

export interface CoverLetterTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  targetType: string;
  defaultQuestions: CoverLetterTemplateQuestion[];
  status: "active" | "inactive";
  orderIndex: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
export type CoverLetterTemplateInput = Partial<Omit<CoverLetterTemplate, "id" | "createdAt" | "updatedAt">> & {
  code: string;
  name: string;
};

export interface CoverLetter {
  id: string;
  userId: string;
  resumeId?: string;
  targetJobId?: string;
  targetOccupationId?: string;
  title: string;
  templateId?: string;
  /**
   * 작성 시작 단계에서 고른 경험뱅크 항목 id.
   * 편집 화면에서 문항마다 AI 초안 재료로 올려둘 후보를 이 목록으로 좁힌다.
   * 경험뱅크에서 지워진 id가 남아있을 수 있으므로 읽는 쪽에서 추려 쓴다.
   */
  experienceBankIds: string[];
  status: CoverLetterStatus;
  version: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
export type CoverLetterInput = Partial<Omit<CoverLetter, "id" | "userId" | "createdAt" | "updatedAt">> & {
  userId: string;
  title: string;
};

export interface CoverLetterSection {
  id: string;
  coverLetterId: string;
  questionType: CoverLetterQuestionType;
  question: string;
  content: string;
  characterLimit?: number;
  orderIndex: number;
}
export type CoverLetterSectionInput = Partial<Omit<CoverLetterSection, "id" | "coverLetterId">> & {
  questionType: CoverLetterQuestionType;
  question: string;
};

export interface CoverLetterDetail {
  coverLetter: CoverLetter;
  sections: CoverLetterSection[];
  template?: CoverLetterTemplate;
}

export interface CoverLetterDetailSaveInput {
  coverLetter: CoverLetterInput & { id?: string };
  sections: CoverLetterSectionInput[];
}
