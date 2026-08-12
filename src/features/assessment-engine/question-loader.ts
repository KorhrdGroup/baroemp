import { getAssessmentRepository } from "@/lib/repositories";
import type { Assessment, AssessmentQuestion, AssessmentSection } from "@/types";

export interface LoadedAssessment {
  assessment: Assessment;
  sections: AssessmentSection[];
  questionsBySection: Map<string, AssessmentQuestion[]>;
  questionsById: Map<string, AssessmentQuestion>;
  orderedQuestions: AssessmentQuestion[];
}

/**
 * DB(Mock/Supabase) 로부터 검사 구조를 로드한다.
 * 어떤 화면 코드도 질문/선택지를 하드코딩하지 않고, 항상 이 함수를 거쳐서만 문항을 얻는다.
 */
export async function loadAssessment(assessmentId: string): Promise<LoadedAssessment | null> {
  const repo = getAssessmentRepository();
  const assessment = await repo.findById(assessmentId);
  if (!assessment) return null;

  const orderedQuestions = [...assessment.questions].sort((a, b) => a.orderIndex - b.orderIndex);
  const sections = [...assessment.sections].sort((a, b) => a.order - b.order);

  const questionsBySection = new Map<string, AssessmentQuestion[]>();
  for (const question of orderedQuestions) {
    const list = questionsBySection.get(question.section) ?? [];
    list.push(question);
    questionsBySection.set(question.section, list);
  }

  const questionsById = new Map(orderedQuestions.map((q) => [q.id, q]));

  return { assessment, sections, questionsBySection, questionsById, orderedQuestions };
}

export async function getActiveDefaultAssessment(): Promise<Assessment | null> {
  const repo = getAssessmentRepository();
  const all = await repo.findAll();
  // 활성 검사가 여러 개 존재할 수 있다 (예: 과거 placeholder 검사 정의가 남아있는 경우).
  // 문항이 없는 검사는 사용자가 절대 완료할 수 없으므로 "실제로 진행 가능한" 검사를 우선 선택한다.
  const activeWithQuestions = all.find((a) => a.isActive && a.questions.length > 0);
  if (activeWithQuestions) return activeWithQuestions;
  return all.find((a) => a.isActive) ?? all[0] ?? null;
}
