/**
 * 직종 필터의 묶음.
 *
 * jobs.job_category 에는 워크넷 6자리 직종코드가 들어 있다(예: 550102). 회원이 고르는 말과
 * 코드는 1:1 이 아니라, 앞자리가 같은 코드 여럿이 한 직종을 이룬다 - 재가·시설·방문 요양이
 * 모두 5501xx 다. 그래서 묶음마다 코드 앞자리를 적어 두고 앞자리로 훑는다.
 *
 * key 는 예전부터 링크에 쓰이던 이름을 그대로 둔다(?category=care_worker). 직업진단에서
 * 넘어오는 6자리 코드도 같은 자리에 실려 오므로, 아는 key 가 아니면 코드로 보고 그대로 쓴다.
 */
export interface JobCategoryGroup {
  key: string;
  label: string;
  /** 이 직종으로 볼 워크넷 직종코드 앞자리. 비어 있으면 걸리는 공고가 없다. */
  prefixes: string[];
}

export const JOB_CATEGORY_GROUPS: JobCategoryGroup[] = [
  { key: "care_worker", label: "요양보호사", prefixes: ["5501"] },
  { key: "social_worker", label: "사회복지사", prefixes: ["2311"] },
  { key: "logistics_driver", label: "배송·운전직", prefixes: ["62"] },
  { key: "office_admin", label: "사무·행정직", prefixes: ["02"] },
  { key: "facility_cleaning", label: "시설관리·미화", prefixes: ["561", "702"] },
  /* 병원동행은 워크넷 직종코드가 따로 없어 걸리는 공고가 없다. */
  { key: "hospital_companion", label: "병원동행", prefixes: [] },
];

const BY_KEY = new Map(JOB_CATEGORY_GROUPS.map((g) => [g.key, g]));

/** 쉼표로 이어 온 직종 값을 낱개로 가른다. */
export function parseJobCategories(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

/**
 * 고른 직종을 검색용 코드 앞자리로 바꾼다.
 * 아는 묶음이면 그 앞자리들을, 아니면(직업진단에서 온 6자리 코드) 값을 그대로 쓴다.
 */
export function toJobCategoryPatterns(tokens: string[]): string[] {
  return tokens.flatMap((t) => BY_KEY.get(t)?.prefixes ?? [t]);
}

/** 버튼에 적을 이름. 묶음에 없는 코드는 호출한 쪽이 찾아 넘긴다. */
export function jobCategoryLabel(token: string, fallback?: string): string {
  return BY_KEY.get(token)?.label ?? fallback ?? "선택한 직종";
}
