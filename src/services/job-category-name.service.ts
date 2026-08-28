import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getOccupationRepository } from "@/lib/repositories";

/**
 * 워크넷 직종코드 → 직종명 조회.
 *
 * 채용공고 목록 API가 코드만 내려주기 때문에, 관리자 통계에서 624102 같은 숫자가 그대로 보이지 않도록
 * job_category_codes 표(scripts/sync-job-category-names.ts 가 채움)를 읽어 이름으로 바꾼다.
 * 표에 없는 코드는 occupations 카탈로그에서 한 번 더 찾고, 그래도 없으면 코드를 그대로 쓴다.
 *
 * 표가 자주 바뀌지 않으므로 프로세스 메모리에 10분 캐시한다.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: { at: number; map: Map<string, string> } | null = null;

export async function getJobCategoryNameMap(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.map;

  const map = new Map<string, string>();

  const admin = createAdminSupabaseClient();
  if (admin) {
    const { data } = await admin.from("job_category_codes").select("code, name");
    for (const row of (data ?? []) as { code: string; name: string }[]) {
      map.set(row.code, row.name);
    }
  }

  // 표에 없는 코드는 직업 카탈로그에 연결된 이름으로 보완한다.
  const occupations = await getOccupationRepository().findAll();
  for (const o of occupations) {
    if (o.jobCategoryCode && !map.has(o.jobCategoryCode)) map.set(o.jobCategoryCode, o.name);
  }

  cache = { at: Date.now(), map };
  return map;
}

/** 코드를 이름으로 바꾼다. 이름을 못 찾으면 코드를 그대로 돌려준다. */
export function labelJobCategory(map: Map<string, string>, code: string): string {
  return map.get(code) ?? code;
}
