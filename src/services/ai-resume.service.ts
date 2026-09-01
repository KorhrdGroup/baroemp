import type {
  AICareerSummaryResult,
  AICoverLetterDraftResult,
  AIResumeReviewResult,
  AISectionRewriteResult,
  AITailorToJobResult,
} from "@/types";
import { getAIResumeProvider } from "@/lib/ai/mock-ai-resume.provider";
import { getJobRepository } from "@/lib/repositories";
import { logActivityEvent } from "@/lib/activity/event-logger";
import { getResumeDetail } from "./resume.service";
import { getCoverLetterDetail } from "./cover-letter.service";

/**
 * AI Resume/Cover Letter 관련 Application Service.
 * getAIResumeProvider()를 통해서만 AI를 호출하므로, 실제 Provider가 STEP 7.5에서 교체되어도
 * 이 파일은 수정할 필요가 없다. 여기서는 "결과를 DB에 즉시 반영"하지 않는다 —
 * 사용자가 결과를 확인하고 [적용하기]를 눌러야 실제 이력서/자소서에 반영되도록,
 * Server Action이 이 함수의 결과를 화면에 보여주는 역할만 담당한다 (허위경력 방지 UX의 일부).
 */
export async function reviewResumeWithAI(resumeId: string): Promise<AIResumeReviewResult> {
  const detail = await getResumeDetail(resumeId);
  if (!detail) throw new Error("이력서를 찾을 수 없습니다.");

  const job = detail.resume.targetJobId ? await getJobRepository().findById(detail.resume.targetJobId) : null;

  const result = await getAIResumeProvider().reviewResume({
    resumeId,
    summary: detail.resume.summary,
    experiences: detail.experiences.map((e) => ({
      companyName: e.companyName,
      jobTitle: e.jobTitle,
      responsibilities: e.responsibilities,
      achievements: e.achievements,
    })),
    educations: detail.educations.map((e) => ({ schoolName: e.schoolName, major: e.major, degree: e.degree })),
    qualifications: detail.qualifications.map((q) => ({ name: q.name })),
    skills: detail.skills.map((s) => s.name),
    targetJobTitle: job?.title ?? detail.resume.desiredJobTitle,
    targetJobDescription: job?.description,
    agentStyle: detail.template?.code,
  });

  await logActivityEvent({
    userId: detail.resume.userId,
    eventType: "resume_ai_reviewed",
    entityType: "resume",
    entityId: resumeId,
    metadata: { score: result.score },
  });

  return result;
}

export async function rewriteResumeSectionWithAI(params: {
  resumeId: string;
  sectionLabel: string;
  originalText: string;
}): Promise<AISectionRewriteResult> {
  const detail = await getResumeDetail(params.resumeId);
  if (!detail) throw new Error("이력서를 찾을 수 없습니다.");

  const result = await getAIResumeProvider().rewriteResumeSection({
    sectionLabel: params.sectionLabel,
    originalText: params.originalText,
    agentStyle: detail.template?.code,
  });

  await logActivityEvent({
    userId: detail.resume.userId,
    eventType: "resume_section_ai_rewritten",
    entityType: "resume",
    entityId: params.resumeId,
    metadata: { section: params.sectionLabel },
  });

  return result;
}

export async function generateCareerSummaryWithAI(resumeId: string): Promise<AICareerSummaryResult> {
  const detail = await getResumeDetail(resumeId);
  if (!detail) throw new Error("이력서를 찾을 수 없습니다.");

  return getAIResumeProvider().generateCareerSummary({
    draftSummary: detail.resume.summary,
    experiences: detail.experiences.map((e) => ({ companyName: e.companyName, jobTitle: e.jobTitle, responsibilities: e.responsibilities })),
    qualifications: detail.qualifications.map((q) => q.name),
    skills: detail.skills.map((s) => s.name),
    desiredJobTitle: detail.resume.desiredJobTitle,
    agentStyle: detail.template?.code,
  });
}

export async function reviewCoverLetterSectionWithAI(params: {
  coverLetterId: string;
  question: string;
  content: string;
}): Promise<AIResumeReviewResult> {
  const detail = await getCoverLetterDetail(params.coverLetterId);
  if (!detail) throw new Error("자기소개서를 찾을 수 없습니다.");

  const result = await getAIResumeProvider().reviewCoverLetter({ question: params.question, content: params.content });

  await logActivityEvent({
    userId: detail.coverLetter.userId,
    eventType: "cover_letter_ai_reviewed",
    entityType: "cover_letter",
    entityId: params.coverLetterId,
    metadata: { score: result.score },
  });

  return result;
}

export async function generateCoverLetterDraftWithAI(params: {
  coverLetterId: string;
  question: string;
  questionType: string;
  characterLimit?: number;
  candidateExperiences: { title: string; situation?: string; task?: string; action?: string; result?: string }[];
}): Promise<AICoverLetterDraftResult> {
  const detail = await getCoverLetterDetail(params.coverLetterId);
  if (!detail) throw new Error("자기소개서를 찾을 수 없습니다.");

  const job = detail.coverLetter.targetJobId ? await getJobRepository().findById(detail.coverLetter.targetJobId) : null;

  const result = await getAIResumeProvider().generateCoverLetterDraft({
    question: params.question,
    questionType: params.questionType,
    characterLimit: params.characterLimit,
    candidateExperiences: params.candidateExperiences,
    targetJobTitle: job?.title,
    targetJobDescription: job?.description,
  });

  await logActivityEvent({
    userId: detail.coverLetter.userId,
    eventType: "cover_letter_ai_generated",
    entityType: "cover_letter",
    entityId: params.coverLetterId,
    metadata: { questionType: params.questionType },
  });

  return result;
}

export async function tailorResumeToJobWithAI(resumeId: string, jobId: string): Promise<AITailorToJobResult> {
  const [detail, job] = await Promise.all([getResumeDetail(resumeId), getJobRepository().findById(jobId)]);
  if (!detail) throw new Error("이력서를 찾을 수 없습니다.");
  if (!job) throw new Error("채용공고를 찾을 수 없습니다.");

  return getAIResumeProvider().tailorToJob({
    resumeSummary: detail.resume.summary,
    experiences: detail.experiences.map((e) => ({ companyName: e.companyName, responsibilities: e.responsibilities, achievements: e.achievements })),
    skills: detail.skills.map((s) => s.name),
    jobTitle: job.title,
    jobDescription: job.description,
    jobRequirements: job.requirements,
  });
}
