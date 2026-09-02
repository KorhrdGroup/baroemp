import type { AssessmentAnswerInput, AssessmentQuestion } from "@/types";

/** UI(클라이언트)에서 올라오는 원시 답변 형태. */
export interface RawAnswerInput {
  questionId: string;
  optionId?: string;
  optionIds?: string[];
  rawValue?: unknown;
}

export interface RegionValue {
  sido: string;
  sigungu?: string;
}

export interface SalaryRangeValue {
  min?: number;
  max?: number;
}

const CUSTOM_QUALIFICATION_MAX_LENGTH = 40;
const CUSTOM_QUALIFICATION_MAX_COUNT = 10;

/** 자격 문항의 직접 입력값을 꺼낸다. 모양이 다르면 빈 배열. */
export function readCustomQualifications(rawValue: unknown): string[] {
  const list = (rawValue as { custom?: unknown } | undefined)?.custom;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const name = item.replace(/\s+/g, " ").trim().slice(0, CUSTOM_QUALIFICATION_MAX_LENGTH);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= CUSTOM_QUALIFICATION_MAX_COUNT) break;
  }
  return out;
}

function clampScale(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * answer_type 별로 원시 입력값을 정규화한다.
 * 이 함수를 거치면 이후 파이프라인(profile-extractor/dimension-scorer)은
 * 항상 안전하고 일관된 형태의 값만 다루게 된다.
 */
export function normalizeAnswer(
  question: AssessmentQuestion,
  raw: RawAnswerInput,
  sessionId: string,
): AssessmentAnswerInput {
  switch (question.answerType) {
    case "SINGLE": {
      return { sessionId, questionId: question.id, optionId: raw.optionId };
    }
    case "MULTI": {
      return { sessionId, questionId: question.id, optionIds: raw.optionIds ?? [] };
    }
    case "QUALIFICATION_MULTI": {
      // 목록에 없는 자격을 직접 적은 것. 자유 입력이라 길이·개수를 잘라 둔다.
      const custom = readCustomQualifications(raw.rawValue);
      return {
        sessionId,
        questionId: question.id,
        optionIds: raw.optionIds ?? [],
        rawValue: custom.length > 0 ? { custom } : undefined,
      };
    }
    case "SCALE": {
      const min = question.minScale ?? 1;
      const max = question.maxScale ?? 5;
      return { sessionId, questionId: question.id, rawValue: clampScale(raw.rawValue, min, max) };
    }
    case "NUMBER": {
      const n = Number(raw.rawValue);
      return { sessionId, questionId: question.id, rawValue: Number.isFinite(n) ? Math.max(0, n) : 0 };
    }
    case "TEXT": {
      return { sessionId, questionId: question.id, rawValue: String(raw.rawValue ?? "").slice(0, 500) };
    }
    case "REGION": {
      const value = (raw.rawValue as RegionValue | undefined) ?? { sido: "" };
      return { sessionId, questionId: question.id, rawValue: value };
    }
    case "SALARY_RANGE": {
      const value = (raw.rawValue as SalaryRangeValue | undefined) ?? {};
      return { sessionId, questionId: question.id, rawValue: value };
    }
    default: {
      return { sessionId, questionId: question.id, rawValue: raw.rawValue };
    }
  }
}
