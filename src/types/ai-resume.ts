/**
 * AI Resume/Cover Letter Provider 구조 (STEP 7).
 *
 * 핵심 원칙 (스펙 29/55번):
 * 1. AI는 사용자가 제공하지 않은 경력/성과/수치를 절대 만들어내지 않는다 (NEVER INVENT EXPERIENCE).
 * 2. 결과는 가능한 구조화된 형태로 반환하고, 자유 텍스트 하나만 파싱하는 구조를 최소화한다.
 * 3. 이력서/공고 원문은 신뢰할 수 없는 사용자 콘텐츠로 취급하고, AI System Instruction으로 실행하지 않는다.
 *
 * 이번 STEP에서는 실제 OpenAI 연결 여부와 무관하게 이 interface만 지키면 Provider를 교체할 수 있다.
 * 현재는 MockAIResumeProvider만 구현하며(mock-ai-resume.provider.ts), 실제 Provider 연결은
 * STEP 7.5로 넘긴다.
 */
import type { CoverLetterQuestionType } from "./cover-letter";
import type { ResumeSectionCode } from "./resume";

export interface AIReviewIssue {
  section: ResumeSectionCode | CoverLetterQuestionType | string;
  severity: "info" | "suggestion" | "critical";
  comment: string;
}

/** 이력서/자소서 첨삭 결과 구조 (스펙 54번 예시를 그대로 따른다). */
export interface AIResumeReviewResult {
  score: number;
  strengths: string[];
  improvements: AIReviewIssue[];
  missingInformation: string[];
  /** 확인되지 않은 성과 등 AI가 임의로 만들면 안 되는 부분에 대한 경고 문구 */
  factualWarnings: string[];
  jobFitComment?: string;
  reviewedAt: string;
}

export interface AISectionRewriteResult {
  originalText: string;
  rewrittenText: string;
  /** 원문에 없던 사실을 추가하지 않았음을 나타내는 자기 검증 플래그(Mock 단계에서는 항상 true 규칙으로 생성) */
  factsPreserved: boolean;
  note?: string;
}

export interface AICareerSummaryResult {
  summary: string;
  basedOn: string[];
}

export interface AICoverLetterDraftResult {
  draft: string;
  usedExperienceIds: string[];
  missingInformationPrompts: string[];
}

export interface AIResumeReviewInput {
  resumeId: string;
  summary?: string;
  experiences: { companyName: string; jobTitle?: string; responsibilities?: string; achievements?: string }[];
  educations: { schoolName: string; major?: string; degree?: string }[];
  qualifications: { name: string }[];
  skills: string[];
  targetJobTitle?: string;
  targetJobDescription?: string;
  /** 선택한 AI 에이전트(ResumeTemplate.code). Provider가 첨삭 기준·톤을 바꾸는 데 쓴다. */
  agentStyle?: string;
}

export interface AISectionRewriteInput {
  sectionLabel: string;
  originalText: string;
  /** 선택한 AI 에이전트(ResumeTemplate.code). */
  agentStyle?: string;
}

export interface AICareerSummaryInput {
  experiences: { companyName: string; jobTitle?: string; responsibilities?: string }[];
  qualifications: string[];
  skills: string[];
  desiredJobTitle?: string;
  careerYears?: number;
  /** 선택한 AI 에이전트(ResumeTemplate.code). */
  agentStyle?: string;
}

export interface AICoverLetterDraftInput {
  question: string;
  questionType: CoverLetterQuestionType;
  characterLimit?: number;
  candidateExperiences: { title: string; situation?: string; task?: string; action?: string; result?: string }[];
  targetJobTitle?: string;
  targetJobDescription?: string;
}

export interface AITailorToJobInput {
  resumeSummary?: string;
  experiences: { companyName: string; responsibilities?: string; achievements?: string }[];
  skills: string[];
  jobTitle: string;
  jobDescription?: string;
  jobRequirements?: string;
}

export interface AITailorToJobResult {
  matchScore: number;
  matchedSkills: string[];
  gapAreas: string[];
  suggestion: string;
}

/**
 * Provider 교체 가능 구조. 실제 OpenAI Provider를 STEP 7.5에서 붙일 때도
 * 이 interface의 메서드 이름/시그니처를 그대로 구현하면 된다.
 */
export interface AIResumeProvider {
  reviewResume(input: AIResumeReviewInput): Promise<AIResumeReviewResult>;
  rewriteResumeSection(input: AISectionRewriteInput): Promise<AISectionRewriteResult>;
  generateCareerSummary(input: AICareerSummaryInput): Promise<AICareerSummaryResult>;
  generateCoverLetterDraft(input: AICoverLetterDraftInput): Promise<AICoverLetterDraftResult>;
  reviewCoverLetter(input: { question: string; content: string }): Promise<AIResumeReviewResult>;
  tailorToJob(input: AITailorToJobInput): Promise<AITailorToJobResult>;
}
