import {
  getAssessmentAnswerRepository,
  getAssessmentSessionRepository,
  getCareerProfileRepository,
} from "@/lib/repositories";
import { REGION_LABELS, labelAgeGroup } from "@/lib/labels";
import type { Assessment, AssessmentQuestion, Region } from "@/types";

/** 표 컬럼 순서를 고정하기 위한 연령대 표시 순서 */
const AGE_COLUMN_ORDER = ["20대", "30대", "40대", "50대", "60대", "70대 이상", "미입력", "비로그인"];

/**
 * 객체로 저장된 답변을 사람이 읽는 문구로 바꾼다.
 * 지역은 {sido}, 희망 급여는 {min,max} 형태로 저장돼 있어 그대로 두면
 * 관리자 화면에 {"sido":"seoul"} 같은 코드가 그대로 노출된다.
 */
function formatObjectAnswer(raw: unknown): string {
  if (!raw || typeof raw !== "object") return String(raw);
  const obj = raw as Record<string, unknown>;

  if (typeof obj.sido === "string") {
    const sido = REGION_LABELS[obj.sido as Region] ?? obj.sido;
    const sigungu = typeof obj.sigungu === "string" && obj.sigungu ? ` ${obj.sigungu}` : "";
    return `${sido}${sigungu}`;
  }

  const min = typeof obj.min === "number" ? obj.min : undefined;
  const max = typeof obj.max === "number" ? obj.max : undefined;
  if (min !== undefined || max !== undefined) {
    if (min !== undefined && max !== undefined) return `${min}~${max}만원`;
    if (min !== undefined) return `${min}만원 이상`;
    return `${max}만원 이하`;
  }

  // 알 수 없는 형태도 코드처럼 보이지 않도록 "키: 값"으로 펼친다.
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");
}

export interface AnswerDistributionRow {
  /** 선택지 텍스트 (SCALE/NUMBER 등은 입력값) */
  label: string;
  total: number;
  byAge: Record<string, number>;
}

export interface QuestionDistribution {
  questionId: string;
  section: string;
  questionText: string;
  answerType: string;
  answeredCount: number;
  rows: AnswerDistributionRow[];
}

export interface AssessmentResponseAnalytics {
  ageColumns: string[];
  totalSessions: number;
  answeredSessions: number;
  questions: QuestionDistribution[];
}

/**
 * "내게 맞는 직업 찾기" 문항별 응답 분포 × 연령대.
 * assessment_answers(원본 답변)를 세션의 회원 프로필(연령대)과 조인해
 * "어떤 나이대 사람들이 어떤 문항에서 무엇을 몇 번 눌렀는지"를 집계한다.
 */
export async function getAssessmentResponseAnalytics(
  assessment: Assessment,
): Promise<AssessmentResponseAnalytics> {
  const [sessions, careerProfiles] = await Promise.all([
    getAssessmentSessionRepository().findAll({ assessmentId: assessment.id }),
    getCareerProfileRepository().findAll({}),
  ]);

  const ageByUser = new Map(careerProfiles.map((cp) => [cp.userId, cp.ageGroup]));
  const ageOfSession = new Map<string, string>();
  for (const s of sessions) {
    if (!s.userId) {
      ageOfSession.set(s.id, "비로그인");
      continue;
    }
    const age = ageByUser.get(s.userId);
    ageOfSession.set(s.id, age ? labelAgeGroup(age) : "미입력");
  }

  const answers = await getAssessmentAnswerRepository().findBySessionIds(sessions.map((s) => s.id));

  const optionTextById = new Map<string, string>();
  const questionById = new Map<string, AssessmentQuestion>();
  for (const q of assessment.questions) {
    questionById.set(q.id, q);
    for (const o of q.options ?? []) optionTextById.set(o.id, o.optionText);
  }

  /** answer 레코드 하나를 표시용 라벨 목록으로 변환 (MULTI는 여러 개) */
  function answerLabels(record: (typeof answers)[number]): string[] {
    if (record.optionIds && record.optionIds.length > 0) {
      return record.optionIds.map((id) => optionTextById.get(id) ?? id);
    }
    if (record.optionId) return [optionTextById.get(record.optionId) ?? record.optionId];
    if (record.rawValue !== undefined && record.rawValue !== null) {
      const q = questionById.get(record.questionId);
      const raw = record.rawValue;
      if (q?.answerType === "SCALE") return [`${raw}점`];
      if (typeof raw === "string" || typeof raw === "number") return [String(raw)];
      return [formatObjectAnswer(raw)];
    }
    return [];
  }

  // questionId -> label -> { total, byAge }
  const agg = new Map<string, Map<string, { total: number; byAge: Map<string, number> }>>();
  const answeredSessionIds = new Set<string>();
  const usedAges = new Set<string>();

  for (const record of answers) {
    const age = ageOfSession.get(record.sessionId) ?? "비로그인";
    answeredSessionIds.add(record.sessionId);
    for (const label of answerLabels(record)) {
      let byLabel = agg.get(record.questionId);
      if (!byLabel) {
        byLabel = new Map();
        agg.set(record.questionId, byLabel);
      }
      let cell = byLabel.get(label);
      if (!cell) {
        cell = { total: 0, byAge: new Map() };
        byLabel.set(label, cell);
      }
      cell.total += 1;
      cell.byAge.set(age, (cell.byAge.get(age) ?? 0) + 1);
      usedAges.add(age);
    }
  }

  const ageColumns = AGE_COLUMN_ORDER.filter((a) => usedAges.has(a));

  const questions: QuestionDistribution[] = assessment.questions
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((q) => {
      const byLabel = agg.get(q.id) ?? new Map();
      // 선택형 문항은 정의된 선택지 순서를 유지하고, 자유입력형은 응답 수 순으로 정렬한다.
      const definedOrder = (q.options ?? []).map((o) => o.optionText);
      const rows: AnswerDistributionRow[] = [...byLabel.entries()]
        .map(([label, cell]) => ({
          label,
          total: cell.total,
          byAge: Object.fromEntries(ageColumns.map((a) => [a, cell.byAge.get(a) ?? 0])),
        }))
        .sort((a, b) => {
          const ia = definedOrder.indexOf(a.label);
          const ib = definedOrder.indexOf(b.label);
          if (ia >= 0 || ib >= 0) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
          return b.total - a.total;
        });
      return {
        questionId: q.id,
        section: q.section,
        questionText: q.questionText,
        answerType: q.answerType,
        answeredCount: rows.reduce((s, r) => s + r.total, 0),
        rows,
      };
    });

  return {
    ageColumns,
    totalSessions: sessions.length,
    answeredSessions: answeredSessionIds.size,
    questions,
  };
}
