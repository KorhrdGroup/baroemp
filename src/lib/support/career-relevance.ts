/**
 * STEP 5.5 [7] "바로취업에 적합한 지원제도" 분류.
 *
 * "행정안전부_대한민국 공공서비스(혜택) 정보" API에는 취업과 무관한 정부 혜택
 * (예: 유아학비, 장려금, 주택금융 보증 등)이 전체의 대부분을 차지한다(실측 기준 약 1만 건).
 * 이 모듈은 제목/요약/지원대상/상세내용/선정기준을 종합해 "바로취업 관련도" 점수를 계산한다.
 *
 * 단일 keyword 매칭이 아니라, 여러 필드(가중치가 다름) × 여러 키워드 그룹을 함께 반영해
 * 점수를 누적한다. DB 원본은 삭제하지 않고, 이 점수로 노출 여부만 걸러낸다(admin-support.service는
 * 필터링 없이 전체를 보여줘 원본 데이터를 그대로 확인할 수 있게 한다).
 */

export interface CareerRelevanceInput {
  title: string;
  summary?: string;
  targetDescription?: string;
  description?: string;
  eligibilityRaw?: string;
  benefitDescription?: string;
  /** 서비스분야 등 API가 제공하는 원본 카테고리 라벨 (예: "보육·교육", "고용·노동") */
  rawCategoryLabel?: string;
}

export interface CareerRelevanceResult {
  score: number;
  reasons: string[];
}

/**
 * 키워드 그룹. 하나의 그룹 안에서는 한 번만 매칭 처리하지만(중복 가산 방지),
 * 서로 다른 그룹이 여러 개 매칭되면 "취업과 관련된 여러 신호가 겹친다"는 뜻이라 점수를 더 준다.
 */
const KEYWORD_GROUPS: Array<{ label: string; keywords: string[] }> = [
  { label: "취업지원", keywords: ["취업지원", "취업 지원", "재취업"] },
  { label: "구직지원", keywords: ["구직", "구직자", "구직활동"] },
  { label: "직업훈련", keywords: ["직업훈련", "직업 훈련"] },
  { label: "교육훈련", keywords: ["교육훈련", "교육 훈련", "훈련비", "훈련장려금"] },
  { label: "자격취득", keywords: ["자격취득", "자격증", "자격 취득"] },
  { label: "청년취업", keywords: ["청년취업", "청년 취업", "청년일자리", "청년 일자리"] },
  { label: "중장년 재취업", keywords: ["중장년", "신중년"] },
  { label: "경력단절", keywords: ["경력단절", "경력 단절", "경단녀"] },
  { label: "여성취업", keywords: ["여성취업", "여성 취업", "새일센터", "새로일하기"] },
  { label: "고용지원", keywords: ["고용지원", "고용 지원", "고용유지", "고용창출", "고용안정"] },
  { label: "국민내일배움카드", keywords: ["국민내일배움카드", "내일배움카드"] },
  { label: "직업능력개발", keywords: ["직업능력개발", "직업능력 개발"] },
  { label: "일자리", keywords: ["일자리"] },
  { label: "취업장려", keywords: ["취업장려", "취업 장려", "고용촉진장려금"] },
  { label: "고용촉진", keywords: ["고용촉진", "고용 촉진"] },
  { label: "지역 일자리", keywords: ["지역일자리", "지역 일자리", "지역맞춤형 일자리"] },
  // 위 STEP5.5 지정 키워드 외, 실 API 데이터 관찰을 통해 추가한 보조 신호(제목 매칭시에만 유효하게 취급).
  { label: "취업(보조)", keywords: ["취업", "이직", "재직자"] },
  { label: "창업(보조)", keywords: ["창업"] },
];

/** 취업과 무관함이 거의 확실한 강한 반대신호. 매칭되면 감점(단, 0점 미만으로는 내리지 않음). */
const NEGATIVE_KEYWORDS = ["유아학비", "보육료", "양육수당", "장려금(자녀)", "누리과정"];

function countGroupMatches(text: string): { matchedGroups: string[]; count: number } {
  const matchedGroups: string[] = [];
  for (const group of KEYWORD_GROUPS) {
    if (group.keywords.some((kw) => text.includes(kw))) {
      matchedGroups.push(group.label);
    }
  }
  return { matchedGroups, count: matchedGroups.length };
}

/**
 * 필드별 가중치: 제목에 등장하면 신뢰도가 가장 높고, 상세 설명/원문 조건은 보조 신호로 취급한다.
 */
export function computeCareerRelevance(input: CareerRelevanceInput): CareerRelevanceResult {
  const reasons: string[] = [];
  let score = 0;

  const title = input.title ?? "";
  const secondary = [input.summary, input.targetDescription].filter(Boolean).join(" ");
  const tertiary = [input.description, input.eligibilityRaw, input.benefitDescription].filter(Boolean).join(" ");

  const titleMatch = countGroupMatches(title);
  if (titleMatch.count > 0) {
    score += Math.min(50, titleMatch.count * 25);
    reasons.push(`제목에 취업 관련 키워드(${titleMatch.matchedGroups.join(", ")}) 포함`);
  }

  const secondaryMatch = countGroupMatches(secondary);
  if (secondaryMatch.count > 0) {
    score += Math.min(35, secondaryMatch.count * 15);
    reasons.push(`요약/지원대상에 취업 관련 키워드(${secondaryMatch.matchedGroups.join(", ")}) 포함`);
  }

  const tertiaryMatch = countGroupMatches(tertiary);
  if (tertiaryMatch.count > 0) {
    score += Math.min(20, tertiaryMatch.count * 5);
    reasons.push(`상세내용/선정기준에 취업 관련 키워드(${tertiaryMatch.matchedGroups.join(", ")}) 포함`);
  }

  if (input.rawCategoryLabel && /고용|노동|취업|일자리/.test(input.rawCategoryLabel)) {
    score += 15;
    reasons.push(`서비스분야가 "${input.rawCategoryLabel}"로 고용/노동 관련`);
  }

  const allText = `${title} ${secondary} ${tertiary}`;
  const negativeHit = NEGATIVE_KEYWORDS.find((kw) => allText.includes(kw));
  if (negativeHit) {
    score -= 30;
    reasons.push(`"${negativeHit}" 등 취업과 무관한 강한 신호 포함 (감점)`);
  }

  score = Math.max(0, Math.min(100, score));
  if (reasons.length === 0) reasons.push("취업 관련 키워드가 발견되지 않음");

  return { score, reasons };
}

/**
 * 이 점수 이상만 "바로취업에 적합한 지원제도"로 사용자에게 노출한다(검색/진단 매칭 풀).
 * 관리자 화면(/admin/support)에는 이 필터를 적용하지 않아 원본 데이터를 그대로 볼 수 있다.
 */
export const CAREER_RELEVANCE_THRESHOLD = 30;

const TRAINING_KEYWORDS = ["훈련", "교육", "자격", "배움카드", "역량개발", "능력개발"];
const REGIONAL_LIVING_KEYWORDS = ["생활안정", "생계", "주거", "임대"];

/**
 * 실 API는 category를 제공하지 않으므로(서비스분야는 "보육·교육" 같은 광범위한 도메인 라벨일 뿐),
 * 관련도 판정에 쓴 것과 동일한 텍스트를 재사용해 4개 내부 카테고리 중 하나로 분류한다.
 * 모호하면 "other"로 남긴다(단정하지 않음).
 */
export function deriveSupportCategory(
  input: CareerRelevanceInput,
  regionScope?: string,
): "employment" | "training" | "regional" | "other" {
  const text = `${input.title} ${input.summary ?? ""} ${input.targetDescription ?? ""} ${input.description ?? ""}`;
  if (TRAINING_KEYWORDS.some((kw) => text.includes(kw))) return "training";
  const { score } = computeCareerRelevance(input);
  if (score >= CAREER_RELEVANCE_THRESHOLD) return "employment";
  if (regionScope && regionScope !== "national" && REGIONAL_LIVING_KEYWORDS.some((kw) => text.includes(kw))) {
    return "regional";
  }
  return "other";
}
