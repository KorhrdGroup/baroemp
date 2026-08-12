import type { CareerGapRequirement, Job, RequirementLevel } from "@/types";

/**
 * Requirement Normalizer (STEP 7.5 스펙 8번).
 *
 * "운전 가능자" / "차량운전 가능" / "운전면허 소지자 우대"처럼 표현이 달라도
 * career_requirements.detection_keywords에 등록된 키워드 중 하나라도 원문에 있으면
 * 같은 canonical requirement(예: driving_available)로 정규화한다.
 *
 * 이 파일은 순수 함수만 담아, Job 원문 -> Requirement 추출과
 * 사용자 Resume/CareerDB 텍스트 -> Requirement 매칭에 동일한 사전을 재사용할 수 있게 한다.
 */

const REQUIRED_MARKERS = ["필수", "반드시", "필요(필수)"];
const PREFERRED_MARKERS = ["우대", "가산점", "있으면 좋음", "선호"];

export function buildJobHaystack(job: Job): { full: string; structured: string } {
  const full = [
    job.title,
    job.companyName,
    job.description,
    job.requirements,
    job.qualificationRequirements,
    job.educationRequirement,
    job.tags?.join(" "),
    job.preferredQualifications?.join(" "),
  ]
    .filter(Boolean)
    .join("\n");
  // "우대" 표현이 구조화 필드(tags/preferredQualifications)에 있는 경우를 별도로 표시해
  // REQUIRED/PREFERRED 판정 시 자유서술 텍스트보다 신뢰도 높게 다룬다.
  const structured = [job.tags?.join(" "), job.preferredQualifications?.join(" ")].filter(Boolean).join(" ");
  return { full, structured };
}

function containsKeyword(haystack: string, keyword: string): boolean {
  return haystack.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * 키워드 주변 텍스트를 보고 REQUIRED/PREFERRED/MENTIONED을 판정한다.
 * "필수"/"우대" 같은 명시적 마커가 원문에 있으면 그 등급을 따르고, 없으면 단순 언급(MENTIONED)으로 둔다.
 * 구조화된 필드(우대사항 태그 등)에서 발견되면 최소 PREFERRED로 취급한다.
 */
export function detectRequirementLevel(haystack: { full: string; structured: string }, keyword: string): RequirementLevel {
  if (!containsKeyword(haystack.full, keyword)) return "MENTIONED";

  const lowerFull = haystack.full.toLowerCase();
  const idx = lowerFull.indexOf(keyword.toLowerCase());
  const windowStart = Math.max(0, idx - 20);
  const windowEnd = Math.min(lowerFull.length, idx + keyword.length + 20);
  const window = lowerFull.slice(windowStart, windowEnd);

  if (REQUIRED_MARKERS.some((marker) => window.includes(marker.toLowerCase()))) return "REQUIRED";
  if (PREFERRED_MARKERS.some((marker) => window.includes(marker.toLowerCase()))) return "PREFERRED";
  if (containsKeyword(haystack.structured, keyword)) return "PREFERRED";
  return "MENTIONED";
}

export interface ExtractedJobRequirement {
  requirementId: string;
  requirementLevel: RequirementLevel;
  sourceText: string;
  confidence: number;
}

/**
 * Job 원문에서 career_requirements 목록을 기준으로 표준화된 요구조건을 추출한다 (스펙 7번).
 * V1은 Rule/Keyword 기반이며, 향후 AI Classification으로 교체하더라도
 * 반환 타입(ExtractedJobRequirement[])은 그대로 유지할 수 있게 설계했다.
 */
export function extractJobRequirements(job: Job, requirements: CareerGapRequirement[]): ExtractedJobRequirement[] {
  const haystack = buildJobHaystack(job);
  const results: ExtractedJobRequirement[] = [];

  for (const requirement of requirements) {
    // Work24 pfPreferential 코드(14=운전가능자)는 자유서술 텍스트보다 신뢰도가 높은 구조화 신호다.
    if (requirement.key === "driving_available" && job.preferentialCodes?.includes("14")) {
      results.push({ requirementId: requirement.id, requirementLevel: "PREFERRED", sourceText: "pfPreferential=14", confidence: 1 });
      continue;
    }

    const matchedKeyword = requirement.detectionKeywords.find((keyword) => containsKeyword(haystack.full, keyword));
    if (!matchedKeyword) continue;

    const level = detectRequirementLevel(haystack, matchedKeyword);
    results.push({ requirementId: requirement.id, requirementLevel: level, sourceText: matchedKeyword, confidence: 0.85 });
  }

  return results;
}

/** 사용자 Resume/CareerDB 자유 텍스트에 특정 Requirement의 키워드가 등장하는지 검사한다 (EXPERIENCE_TEXT/SKILL_KEYWORD 매칭용). */
export function textMentionsRequirement(text: string | undefined | null, requirement: CareerGapRequirement): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return requirement.detectionKeywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

/** 이름 기반 목록(자격명/스킬명)에서 Requirement와 매칭되는 항목이 있는지 검사한다. */
export function namesMatchRequirement(names: string[], requirement: CareerGapRequirement): boolean {
  return names.some((name) => requirement.detectionKeywords.some((keyword) => name.includes(keyword) || keyword.includes(name)));
}
