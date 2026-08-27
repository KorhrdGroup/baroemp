import type {
  AgeGroup,
  DesiredStartTiming,
  EmploymentStatus,
  MatchReasonDetail,
  Region,
  SupportEligibilityGrade,
  SupportProgram,
  SupportProgramRule,
} from "@/types";
import { getSupportProgramRuleRepository } from "@/lib/repositories";

/**
 * Eligibility Rule Engine이 판정에 사용하는 사용자 조건 스냅샷.
 * 지원금 진단 답변(SupportAssessmentAnswers) 또는 로그인 사용자의 CareerProfile로부터 만들어진다.
 */
export interface SupportMatchProfile {
  ageGroup?: AgeGroup;
  /** 출생연도. 있으면 연령대 중간값 대신 만 나이로 정확히 매칭한다. */
  birthYear?: number;
  region?: Region;
  employmentStatus?: EmploymentStatus;
  desiredStartTiming?: DesiredStartTiming;
  /** 직업훈련 참여 의향 (1~5 스케일) */
  trainingWillingness?: number;
  heldQualifications?: string[];
  desiredJobCategories?: string[];
  currentJobCategory?: string;
  careerBreak?: boolean;
  careerBreakMonths?: number;
  /** 최근 3년 내 고용보험 가입 이력 */
  employmentInsuranceHistory?: "yes" | "no" | "unknown";
  /** 가구 소득 수준 (참고 구간) */
  incomeBand?: "low" | "middle" | "high" | "unknown";
  /** 가구 특성 (한부모/장애/기초수급 등) */
  householdTraits?: string[];
}

export interface SupportMatchDetail {
  supportProgramId: string;
  score: number;
  grade: SupportEligibilityGrade;
  reasons: MatchReasonDetail[];
  matchedConditions: string[];
  missingConditions: string[];
  /** 소득/재산 등 시스템이 자동 판정할 수 없어 "확인 필요"로 안내하는 조건들. */
  checkRequiredConditions: string[];
}

const AGE_GROUP_MIDPOINT: Record<AgeGroup, number> = {
  "20s": 25,
  "30s": 35,
  "40s": 45,
  "50s": 55,
  "60s": 65,
  "70plus": 75,
};

function deriveAge(profile: Pick<SupportMatchProfile, "ageGroup" | "birthYear">): number | undefined {
  // 출생연도가 있으면 만 나이로 정확히, 없으면 연령대 중간값으로 근사한다.
  if (profile.birthYear) return new Date().getFullYear() - profile.birthYear;
  return profile.ageGroup ? AGE_GROUP_MIDPOINT[profile.ageGroup] : undefined;
}

function evaluateOperator(operator: SupportProgramRule["operator"], ruleValue: unknown, actual: unknown): boolean {
  switch (operator) {
    case "EQ":
      return actual === ruleValue;
    case "IN":
      return Array.isArray(ruleValue) && actual !== undefined && ruleValue.includes(actual as never);
    case "BETWEEN": {
      if (!Array.isArray(ruleValue) || ruleValue.length !== 2 || typeof actual !== "number") return false;
      const [min, max] = ruleValue as [number, number];
      return actual >= min && actual <= max;
    }
    case "GTE":
      return typeof actual === "number" && typeof ruleValue === "number" && actual >= ruleValue;
    case "LTE":
      return typeof actual === "number" && typeof ruleValue === "number" && actual <= ruleValue;
    case "EXISTS":
      return actual !== undefined && actual !== null && actual !== false;
    default:
      return false;
  }
}

/** 자연어로만 존재해 시스템이 자동 판정할 수 없는 필드 (항상 "확인 필요"로 안내). */
const UNVERIFIABLE_RULE_FIELDS = new Set(["income_condition", "household_condition", "education_condition"]);

const FIELD_LABELS: Record<string, string> = {
  age: "연령 조건",
  region: "거주지역 조건",
  employment_status: "취업상태 조건",
  career_break: "경력단절 조건",
  training_willingness: "직업훈련 참여 의향",
  desired_job_category: "희망직종 조건",
  income_condition: "소득/재산 조건",
  household_condition: "가구 조건",
  education_condition: "학력/교육 조건",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function resolveActualValue(field: string, profile: SupportMatchProfile): unknown {
  switch (field) {
    case "age":
      return deriveAge(profile);
    case "employment_insurance":
      return profile.employmentInsuranceHistory;
    case "income_band":
      return profile.incomeBand;
    case "household_condition":
      return profile.householdTraits;
    case "region":
      return profile.region;
    case "employment_status":
      return profile.employmentStatus;
    case "career_break":
      return profile.careerBreak;
    case "training_willingness":
      return profile.trainingWillingness;
    case "desired_job_category":
      return profile.currentJobCategory ? [profile.currentJobCategory] : profile.desiredJobCategories;
    default:
      return undefined;
  }
}

function evaluateStructuredRule(
  rule: SupportProgramRule,
  profile: SupportMatchProfile,
): { status: "matched" | "missing" | "check_required"; reason?: MatchReasonDetail } {
  if (UNVERIFIABLE_RULE_FIELDS.has(rule.field)) {
    return { status: "check_required" };
  }
  const actual = resolveActualValue(rule.field, profile);
  if (actual === undefined) {
    return { status: "check_required" };
  }
  const matched = evaluateOperator(rule.operator, rule.value, actual);
  if (matched) {
    return {
      status: "matched",
      reason: { ruleKey: `rule_${rule.field}`, label: fieldLabel(rule.field), score: rule.weight },
    };
  }
  return { status: "missing" };
}

/** 프로그램 기본 필드(rules 없이도 항상 계산 가능)로 판정하는 휴리스틱 베이스 스코어. */
function evaluateBaseFields(program: SupportProgram, profile: SupportMatchProfile) {
  const reasons: MatchReasonDetail[] = [];
  const matched: string[] = [];
  const missing: string[] = [];
  const checkRequired: string[] = [];

  const age = deriveAge(profile);

  // 연령
  if (program.targetAgeMin !== undefined || program.targetAgeMax !== undefined) {
    if (age !== undefined) {
      const min = program.targetAgeMin ?? 0;
      const max = program.targetAgeMax ?? 200;
      if (age >= min && age <= max) {
        reasons.push({ ruleKey: "age_range", label: "연령 조건 일치", score: 20 });
        matched.push("연령 조건");
      } else {
        missing.push("연령 조건");
      }
    } else {
      checkRequired.push("연령 조건");
    }
  } else if (program.targetAgeGroups.length > 0) {
    if (profile.ageGroup && program.targetAgeGroups.includes(profile.ageGroup)) {
      reasons.push({ ruleKey: "age_group", label: "연령대 조건 일치", score: 15 });
      matched.push("연령대 조건");
    } else if (profile.ageGroup) {
      missing.push("연령대 조건");
    }
  }

  // 지역
  if (program.regionScope === "national") {
    reasons.push({ ruleKey: "region_national", label: "전국 대상", score: 10 });
    matched.push("지역 조건(전국)");
  } else if (program.regionScope) {
    if (profile.region && profile.region === program.regionScope) {
      reasons.push({ ruleKey: "region_match", label: "거주지역 조건 일치", score: 20 });
      matched.push("거주지역 조건");
    } else if (profile.region) {
      missing.push("거주지역 조건");
    } else {
      checkRequired.push("거주지역 조건");
    }
  }

  // 취업상태
  if (program.employmentStatusTargets && program.employmentStatusTargets.length > 0) {
    if (profile.employmentStatus && program.employmentStatusTargets.includes(profile.employmentStatus)) {
      reasons.push({ ruleKey: "employment_status", label: "취업상태 조건 일치", score: 20 });
      matched.push("취업상태 조건");
    } else if (profile.employmentStatus) {
      missing.push("취업상태 조건");
    } else {
      checkRequired.push("취업상태 조건");
    }
  }

  // 직업훈련 참여 의향 (교육/훈련 카테고리에서만 의미가 있다)
  if (program.category === "training") {
    if (profile.trainingWillingness !== undefined) {
      if (profile.trainingWillingness >= 3) {
        reasons.push({ ruleKey: "training_willingness", label: "직업훈련 참여 의향 있음", score: 15 });
        matched.push("직업훈련 참여 의향");
      } else {
        // 의향이 낮은 건 자격 미달이 아니라 본인 선택이므로, 미노출(LOW) 대신 "확인 필요"로 남긴다.
        checkRequired.push("직업훈련 참여 의향(낮게 응답)");
      }
    } else {
      checkRequired.push("직업훈련 참여 의향");
    }
  }

  // 종사 직종 연관성
  if (program.relatedJobCategories && program.relatedJobCategories.length > 0) {
    const cats = profile.currentJobCategory ? [profile.currentJobCategory] : (profile.desiredJobCategories ?? []);
    const overlap = cats.some((c) => program.relatedJobCategories!.includes(c));
    if (overlap) {
      reasons.push({ ruleKey: "job_category", label: "종사직종 연관 지원제도", score: 10 });
      matched.push("종사직종 연관성");
    }
  }

  // 관련 자격
  if (program.relatedQualificationCodes && program.relatedQualificationCodes.length > 0) {
    const heldSet = new Set(profile.heldQualifications ?? []);
    const hasAny = program.relatedQualificationCodes.some((code) => heldSet.has(code));
    if (hasAny) {
      reasons.push({ ruleKey: "qualification", label: "관련 자격 보유", score: 10 });
      matched.push("관련 자격");
    } else {
      missing.push("관련 자격(미보유 — 연계 과정 확인 가능)");
    }
  }

  // 소득/재산/가구/학력 등 자연어 조건 - 항상 확인 필요
  if (program.incomeCondition) checkRequired.push("소득/재산 조건");
  if (program.householdCondition) checkRequired.push("가구 조건");
  if (program.educationCondition) checkRequired.push("학력/교육 조건");
  if (program.careerCondition && !matched.includes("경력단절 조건")) checkRequired.push("경력단절 세부요건");

  // 신청기간
  if (program.applicationEndAt) {
    const daysLeft = (new Date(program.applicationEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft >= 0 && daysLeft <= 14) {
      checkRequired.push("신청기간 임박 - 서둘러 확인하세요");
    }
  }

  return { reasons, matched, missing, checkRequired };
}

function resolveGrade(
  score: number,
  hasFailedRequiredRule: boolean,
  checkRequiredCount: number,
): SupportEligibilityGrade {
  if (hasFailedRequiredRule) return "LOW";
  if (checkRequiredCount > 0 && score >= 40) return "CHECK_REQUIRED";
  // 점수 체계상 일반 제도의 상한이 45~75라 65 컷은 사실상 도달 불가였다 (페르소나 4종 전부 HIGH 0건).
  if (score >= 50) return "HIGH";
  if (score >= 35) return "MEDIUM";
  if (checkRequiredCount > 0) return "CHECK_REQUIRED";
  return "LOW";
}

/**
 * 지원제도 ↔ 사용자 조건 매칭. Job Detail의 evaluateJobFit()과 동일한 철학이나,
 * 지원제도는 구조화 Rule(있으면)과 프로그램 기본 필드(항상)를 함께 사용해 판정한다.
 *
 * "받을 수 있습니다"라는 확정적 표현을 피하기 위해 등급(HIGH/MEDIUM/CHECK_REQUIRED/LOW)만 반환하고,
 * 최종 신청 가능 여부는 운영기관 확인이 필요하다는 안내를 UI에서 별도로 노출한다.
 */
export function evaluateSupportEligibilitySync(
  program: SupportProgram,
  profile: SupportMatchProfile,
  rules: SupportProgramRule[],
): SupportMatchDetail {
  const base = evaluateBaseFields(program, profile);
  const reasons = [...base.reasons];
  const matched = [...base.matched];
  const missing = [...base.missing];
  const checkRequired = [...base.checkRequired];
  let hasFailedRequiredRule = false;

  for (const rule of rules) {
    const result = evaluateStructuredRule(rule, profile);
    const label = fieldLabel(rule.field);
    if (result.status === "matched" && result.reason) {
      reasons.push(result.reason);
      if (!matched.includes(label)) matched.push(label);
    } else if (result.status === "missing") {
      if (!missing.includes(label)) missing.push(label);
      if (rule.isRequired) hasFailedRequiredRule = true;
    } else {
      if (!checkRequired.includes(label)) checkRequired.push(label);
    }
  }

  const rawScore = reasons.reduce((sum, r) => sum + r.score, 0);
  const score = Math.max(0, Math.min(100, rawScore));
  const grade = resolveGrade(score, hasFailedRequiredRule, checkRequired.length);

  return {
    supportProgramId: program.id,
    score,
    grade,
    reasons: reasons.sort((a, b) => b.score - a.score),
    matchedConditions: [...new Set(matched)],
    missingConditions: [...new Set(missing)],
    checkRequiredConditions: [...new Set(checkRequired)],
  };
}

/** 단일 프로그램 판정 (Rule을 DB에서 조회해야 하므로 async). */
export async function evaluateSupportEligibility(
  program: SupportProgram,
  profile: SupportMatchProfile,
): Promise<SupportMatchDetail> {
  const rules = await getSupportProgramRuleRepository().findByProgramId(program.id);
  return evaluateSupportEligibilitySync(program, profile, rules);
}

/** 다건 판정 (결과 페이지 등에서 사용 — Rule을 한 번에 조회해 N+1 쿼리를 피한다). */
export async function evaluateSupportEligibilityBatch(
  programs: SupportProgram[],
  profile: SupportMatchProfile,
): Promise<Map<string, SupportMatchDetail>> {
  const rulesByProgram = await getSupportProgramRuleRepository().findByProgramIds(programs.map((p) => p.id));
  const grouped = new Map<string, SupportProgramRule[]>();
  for (const rule of rulesByProgram) {
    const list = grouped.get(rule.supportProgramId) ?? [];
    list.push(rule);
    grouped.set(rule.supportProgramId, list);
  }
  const result = new Map<string, SupportMatchDetail>();
  for (const program of programs) {
    result.set(program.id, evaluateSupportEligibilitySync(program, profile, grouped.get(program.id) ?? []));
  }
  return result;
}
