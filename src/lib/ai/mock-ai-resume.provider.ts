import type {
  AICareerSummaryInput,
  AICareerSummaryResult,
  AICoverLetterDraftInput,
  AICoverLetterDraftResult,
  AIResumeProvider,
  AIResumeReviewInput,
  AIResumeReviewResult,
  AISectionRewriteInput,
  AISectionRewriteResult,
  AITailorToJobInput,
  AITailorToJobResult,
  AIReviewIssue,
} from "@/types";

/**
 * MockAIResumeProvider (스펙 53번).
 *
 * 실제 OpenAI 등의 Provider가 아직 연결되지 않은 상태에서도 Resume/Cover Letter Builder,
 * Template, Career DB, Job 연결, Preview가 전부 정상 동작해야 하므로 이 Mock Provider를
 * AIResumeProvider interface에 맞춰 구현한다.
 *
 * 가장 중요한 제약(스펙 29/55번): 사용자가 입력하지 않은 경력/성과/수치를 절대 만들어내지 않는다.
 * 이 Mock 구현은 사용자가 준 텍스트를 "정리/재문장화"만 하고, 새로운 사실(숫자, 회사명, 성과)을
 * 추가하지 않는다. 향후 실제 LLM Provider로 교체할 때도 System Prompt에 동일 원칙을 강제해야 한다.
 */
function trimText(text: string | undefined): string {
  return (text ?? "").trim();
}

/**
 * 에이전트(ResumeTemplate.code)별 첨삭 관점. 실제 LLM Provider로 교체할 때는
 * 이 관점을 System Prompt에 넣어 에이전트마다 점검 기준·톤이 달라지게 한다.
 */
const AGENT_REVIEW_FOCUS: Record<string, string> = {
  EXPERIENCED: "경력직 기준: 담당업무보다 성과(무엇이 좋아졌는지)가 먼저 읽히도록 문장 순서를 조정해보세요.",
  MIDLIFE: "중장년 재취업 기준: 오래 근무한 이력과 꾸준함이 드러나는 문장을 앞쪽에 배치해보세요.",
  CARE_WELFARE: "돌봄 직무 기준: 요양보호사·사회복지사 등 자격과 현장 경험이 상단에서 바로 보이게 배치해보세요.",
};

const AGENT_SUMMARY_TONE: Record<string, string> = {
  EXPERIENCED: "성과로 기여할 준비가 된 경력직 지원자",
  MIDLIFE: "축적된 경력으로 꾸준히 오래 일할 준비가 된 지원자",
  CARE_WELFARE: "현장에서 신뢰받는 돌봄 직무 지원자",
};

export function createMockAIResumeProvider(): AIResumeProvider {
  return {
    async reviewResume(input: AIResumeReviewInput): Promise<AIResumeReviewResult> {
      const strengths: string[] = [];
      const improvements: AIReviewIssue[] = [];
      const missingInformation: string[] = [];
      const factualWarnings: string[] = [];

      if (trimText(input.summary)) {
        strengths.push("핵심 경력 요약이 상단에 명확하게 작성되어 있습니다.");
      } else {
        missingInformation.push("한 줄 소개가 비어 있습니다.");
        improvements.push({
          section: "SUMMARY",
          severity: "suggestion",
          comment: "채용 담당자가 3초 안에 파악할 수 있도록 핵심 경력을 한 줄로 요약해보세요.",
        });
      }

      if (input.experiences.length === 0) {
        missingInformation.push("경력 정보가 없습니다.");
      } else {
        const withoutAchievements = input.experiences.filter((e) => !trimText(e.achievements));
        const withoutResponsibilities = input.experiences.filter((e) => !trimText(e.responsibilities));
        if (withoutResponsibilities.length > 0) {
          improvements.push({
            section: "EXPERIENCE",
            severity: "critical",
            comment: `${withoutResponsibilities.map((e) => e.companyName).join(", ")}의 담당업무가 비어 있습니다. 어떤 일을 하셨는지 구체적으로 적어주세요.`,
          });
        } else {
          strengths.push("모든 경력에 담당업무가 구체적으로 작성되어 있습니다.");
        }
        if (withoutAchievements.length > 0) {
          improvements.push({
            section: "EXPERIENCE",
            severity: "info",
            comment: "구체적인 성과가 있다면 추가해주세요. (숫자가 없어도 괜찮습니다)",
          });
        } else {
          strengths.push("경력별 성과가 함께 기재되어 있어 설득력이 높습니다.");
        }
      }

      if (input.educations.length === 0) {
        missingInformation.push("학력 정보가 없습니다.");
      }

      if (input.qualifications.length === 0) {
        improvements.push({
          section: "QUALIFICATION",
          severity: "info",
          comment: "보유 자격증이 있다면 추가하면 신뢰도를 높일 수 있습니다.",
        });
      } else {
        strengths.push("보유 자격증이 이력서에 잘 반영되어 있습니다.");
      }

      if (input.skills.length === 0) {
        improvements.push({
          section: "SKILLS",
          severity: "info",
          comment: "활용 가능한 스킬(엑셀, 상담, 운전 등)을 추가하면 직무 적합성을 더 잘 보여줄 수 있습니다.",
        });
      }

      const agentFocus = input.agentStyle ? AGENT_REVIEW_FOCUS[input.agentStyle] : undefined;
      if (agentFocus) {
        improvements.push({ section: "SUMMARY", severity: "suggestion", comment: agentFocus });
      }

      let jobFitComment: string | undefined;
      if (input.targetJobTitle) {
        jobFitComment = `"${input.targetJobTitle}" 직무를 기준으로 볼 때, 실제 경력/자격과 연결되는 부분을 더 강조하면 적합도가 올라갑니다.`;
      }

      const totalChecks = 6;
      const passedChecks = strengths.length;
      const score = Math.max(30, Math.min(95, Math.round((passedChecks / totalChecks) * 100)));

      return {
        score,
        strengths,
        improvements,
        missingInformation,
        factualWarnings,
        jobFitComment,
        reviewedAt: new Date().toISOString(),
      };
    },

    async rewriteResumeSection(input: AISectionRewriteInput): Promise<AISectionRewriteResult> {
      const original = trimText(input.originalText);
      if (!original) {
        return {
          originalText: original,
          rewrittenText: "",
          factsPreserved: true,
          note: "원문이 비어 있어 다듬을 내용이 없습니다. 먼저 내용을 입력해주세요.",
        };
      }

      // 사용자가 준 문장만 재구성한다. 새로운 사실(숫자/회사명/성과)을 추가하지 않는다.
      const normalized = original.replace(/\.$/, "");
      const rewritten = `${normalized}${normalized.endsWith("다") ? "." : "을 담당했습니다."} 이 과정에서 관련 업무를 책임감 있게 수행하며 맡은 역할을 완수했습니다.`;

      return {
        originalText: original,
        rewrittenText: rewritten,
        factsPreserved: true,
        note: "AI는 입력하신 내용만 문장을 다듬었습니다. 사실과 다르면 자유롭게 수정해주세요.",
      };
    },

    async generateCareerSummary(input: AICareerSummaryInput): Promise<AICareerSummaryResult> {
      const basedOn: string[] = [];
      const parts: string[] = [];

      // 사용자가 써 둔 초안이 있으면 그 사실을 문장 앞에 살린다. 빈손 기본 문구보다 낫다.
      const draft = trimText(input.draftSummary);
      if (draft) {
        parts.push(draft.replace(/^나는\s*/, "").replace(/[.。]\s*$/, ""));
        basedOn.push("작성해 둔 초안");
      }

      if (input.careerYears && input.careerYears > 0) {
        parts.push(`총 ${input.careerYears}년의 경력`);
        basedOn.push("입력된 경력 기간");
      }

      const topCompanies = input.experiences.slice(0, 2).map((e) => e.jobTitle || e.companyName).filter(Boolean);
      if (topCompanies.length > 0) {
        parts.push(`${topCompanies.join(", ")} 업무 경험`);
        basedOn.push("경력 사항");
      }

      if (input.skills.length > 0) {
        parts.push(`${input.skills.slice(0, 3).join(", ")} 역량 보유`);
        basedOn.push("스킬");
      }

      if (input.qualifications.length > 0) {
        parts.push(`${input.qualifications.slice(0, 2).join(", ")} 자격 보유`);
        basedOn.push("보유 자격");
      }

      const agentTone = input.agentStyle ? AGENT_SUMMARY_TONE[input.agentStyle] : undefined;
      const target = input.desiredJobTitle
        ? `${input.desiredJobTitle}${agentTone ? `에서 ${agentTone}` : "을 준비하는 지원자"}`
        : (agentTone ?? "새로운 도전을 준비하는 지원자");

      const summary = parts.length > 0 ? `${parts.join(", ")}. ${target}입니다.` : `${target}입니다.`;

      return { summary, basedOn: [...new Set(basedOn)] };
    },

    async generateCoverLetterDraft(input: AICoverLetterDraftInput): Promise<AICoverLetterDraftResult> {
      if (input.candidateExperiences.length === 0) {
        return {
          draft: "",
          usedExperienceIds: [],
          missingInformationPrompts: ["이 질문에 사용할 경험을 Experience Bank에서 선택하거나 새로 입력해주세요."],
        };
      }

      const sentences: string[] = [];
      for (const exp of input.candidateExperiences) {
        const bits = [exp.situation, exp.task, exp.action, exp.result].map(trimText).filter(Boolean);
        if (bits.length > 0) sentences.push(bits.join(" "));
      }

      let draft = sentences.join(" ");
      if (input.targetJobTitle) {
        draft += ` 이러한 경험을 바탕으로 ${input.targetJobTitle} 직무에서도 책임감 있게 기여하고자 합니다.`;
      }

      if (input.characterLimit && draft.length > input.characterLimit) {
        draft = `${draft.slice(0, input.characterLimit - 1)}…`;
      }

      const missingInformationPrompts: string[] = [];
      if (!sentences.length) {
        missingInformationPrompts.push("선택한 경험에 상황/역할/행동/결과 중 채워진 내용이 부족합니다. 조금 더 구체적으로 입력해주세요.");
      }

      return { draft, usedExperienceIds: [], missingInformationPrompts };
    },

    async reviewCoverLetter(input: { question: string; content: string }): Promise<AIResumeReviewResult> {
      const content = trimText(input.content);
      const strengths: string[] = [];
      const improvements: AIReviewIssue[] = [];
      const missingInformation: string[] = [];

      if (!content) {
        missingInformation.push("답변 내용이 비어 있습니다.");
      } else if (content.length < 100) {
        improvements.push({
          section: input.question,
          severity: "suggestion",
          comment: "답변이 짧습니다. 구체적인 상황과 행동, 결과를 조금 더 추가해보세요.",
        });
      } else {
        strengths.push("질문 의도에 맞게 충분한 분량으로 작성되어 있습니다.");
      }

      const score = content.length === 0 ? 0 : content.length < 100 ? 55 : 80;
      return {
        score,
        strengths,
        improvements,
        missingInformation,
        factualWarnings: [],
        reviewedAt: new Date().toISOString(),
      };
    },

    async tailorToJob(input: AITailorToJobInput): Promise<AITailorToJobResult> {
      const jobText = `${input.jobDescription ?? ""} ${input.jobRequirements ?? ""}`.toLowerCase();
      const matchedSkills = input.skills.filter((skill) => jobText.includes(skill.toLowerCase()));
      const gapAreas = input.skills.length === 0 ? ["보유 스킬이 등록되어 있지 않습니다."] : [];

      const matchScore = input.skills.length === 0 ? 0 : Math.round((matchedSkills.length / input.skills.length) * 100);

      const suggestion =
        matchedSkills.length > 0
          ? `보유한 ${matchedSkills.join(", ")} 역량을 "${input.jobTitle}" 공고 요건과 연결해 강조해보세요.`
          : `현재 등록된 스킬과 "${input.jobTitle}" 공고 요건의 직접적인 키워드 일치는 적습니다. 실제 경험 중 관련 있는 부분을 다시 확인해보세요.`;

      return { matchScore, matchedSkills, gapAreas, suggestion };
    },
  };
}

let provider: AIResumeProvider | null = null;

/**
 * 실제 Provider 연결 여부와 무관하게 항상 이 함수를 통해 Provider를 얻어야 한다.
 * ANTHROPIC_API_KEY가 있으면 Claude(claude-opus-5), 없으면 Mock으로 동작한다.
 * 키 없는 로컬·프리뷰 환경에서도 빌더 화면이 죽지 않게 하려는 분기다.
 */
export function getAIResumeProvider(): AIResumeProvider {
  if (!provider) {
    provider = process.env.ANTHROPIC_API_KEY
      ? // 지연 로드: Mock만 쓰는 환경에서 SDK 모듈을 불러올 필요가 없다.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require("./claude-ai-resume.provider") as typeof import("./claude-ai-resume.provider")).createClaudeAIResumeProvider()
      : createMockAIResumeProvider();
  }
  return provider;
}
