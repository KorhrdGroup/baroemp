import type { Job } from "@/types";

/**
 * Occupation 수준(jobCategory)보다 더 세부적인 관심사를 추론하기 위한 키워드 -> 태그 매핑.
 *
 * 특정 직업을 코드에 과도하게 하드코딩하지 않기 위해, 이 규칙은 "키워드가 포함되면 태그를 붙인다"는
 * 느슨한 매핑만 제공한다. 새 세부 관심사가 필요하면 이 배열에 항목만 추가하면 되고,
 * job-interest.service.ts는 수정할 필요가 없다.
 */
export interface JobDetailTagRule {
  tag: string;
  keywords: string[];
}

export const JOB_DETAIL_TAG_RULES: JobDetailTagRule[] = [
  { tag: "재가복지", keywords: ["재가복지", "재가노인", "재가 노인", "재가급여"] },
  { tag: "요양원", keywords: ["요양원", "요양시설", "요양병원"] },
  { tag: "주야간보호", keywords: ["주야간보호", "주간보호", "데이케어"] },
  { tag: "지역아동센터", keywords: ["지역아동센터", "아동센터"] },
  { tag: "병원동행", keywords: ["병원동행", "병원 동행", "간병"] },
  { tag: "운전배송", keywords: ["운전", "배송", "택배", "물류"] },
  { tag: "사무행정", keywords: ["사무", "행정", "총무", "경리"] },
  { tag: "시설관리", keywords: ["시설관리", "미화", "청소", "경비"] },
  { tag: "교대근무선호", keywords: ["교대근무", "야간근무"] },
  { tag: "단시간근무선호", keywords: ["파트타임", "시간선택제", "단시간"] },
];

/** 임의의 텍스트(제목/설명 등)에서 매칭되는 세부 태그를 추출한다. (중복 제거) */
export function extractTagsFromText(text: string): string[] {
  const haystack = text.toLowerCase();
  const matched = JOB_DETAIL_TAG_RULES.filter((rule) => rule.keywords.some((kw) => haystack.includes(kw.toLowerCase())));
  return [...new Set(matched.map((rule) => rule.tag))];
}

/** 채용공고의 제목/설명/태그에서 매칭되는 세부 관심 태그를 추출한다. (중복 제거) */
export function extractJobDetailTags(job: Job): string[] {
  return extractTagsFromText(`${job.title} ${job.description} ${job.tags.join(" ")} ${job.occupationName ?? ""}`);
}

/** 관심 태그로 승격되기 전, 같은 세부 태그가 몇 번 이상 등장해야 하는지 (반복조회 기준). */
export const JOB_DETAIL_TAG_REPEAT_THRESHOLD = 2;
