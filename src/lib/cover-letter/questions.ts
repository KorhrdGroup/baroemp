import type { CoverLetterTemplate, CoverLetterTemplateQuestion } from "@/types";

/**
 * 문항의 짧은 이름.
 *
 * 문항 원문은 "지원 동기를 작성해주세요." 처럼 시키는 말이다. 쓰는 칸 위에서는 그게 맞지만
 * 문항을 고르는 알약이나 완성된 문서의 제목으로는 길고 어색하다. 종류별로 짧은 이름을 둔다.
 *
 * 관리자나 회원이 직접 넣은 문항(CUSTOM)은 종류가 없으므로 원문에서 시키는 말꼬리만 뗀다.
 */
export const QUESTION_HEADINGS: Record<string, string> = {
  MOTIVATION: "지원 동기",
  FIELD_INTEREST: "지원 분야에 관심을 갖게 된 계기",
  EXPERIENCE: "주요 경력",
  JOB_FIT: "직무 적합성",
  STRENGTH: "나의 강점",
  PROBLEM_SOLVING: "문제해결 경험",
  INTERPERSONAL: "대인관계 경험",
  CONFLICT_HANDLING: "갈등 대응 경험",
  RESPONSIBILITY: "책임감과 업무 태도",
  CONTRIBUTION: "기여할 수 있는 점",
  ASPIRATION: "입사 후 포부",
};

export function questionHeading(questionType: string, question: string): string {
  const preset = QUESTION_HEADINGS[questionType];
  if (preset) return preset;

  return (
    question
      .trim()
      .replace(/\s*(을|를|에 대해|에 대하여|에 관해|에 관하여)?\s*(작성|기술|서술)해\s*주세요[.!]?$/, "")
      .trim() || question
  );
}

export interface QuestionCatalogEntry extends CoverLetterTemplateQuestion {
  /** 알약에 찍는 짧은 이름 */
  label: string;
  /** 이 문항을 기본으로 담고 있는 양식 code 들. "이 분야에서 자주 묻는 문항" 표시에 쓴다. */
  templateCodes: string[];
}

/**
 * 고를 수 있는 문항 목록.
 *
 * 양식별로 문항을 나눠 보여주면 회원이 "내 양식에 없는 문항은 못 쓰나" 하고 멈춘다.
 * 모든 양식의 기본 문항을 한 곳에 모아 종류별로 하나씩만 남기고, 어느 양식 것인지는
 * templateCodes 로 표시만 한다. 같은 종류가 여러 양식에 있으면 먼저 오는 양식의 문구를 쓴다.
 */
export function buildQuestionCatalog(templates: CoverLetterTemplate[]): QuestionCatalogEntry[] {
  const byType = new Map<string, QuestionCatalogEntry>();

  for (const template of [...templates].sort((a, b) => a.orderIndex - b.orderIndex)) {
    for (const question of template.defaultQuestions) {
      const existing = byType.get(question.questionType);
      if (existing) {
        existing.templateCodes.push(template.code);
        continue;
      }
      byType.set(question.questionType, {
        ...question,
        label: questionHeading(question.questionType, question.question),
        templateCodes: [template.code],
      });
    }
  }

  return [...byType.values()];
}
