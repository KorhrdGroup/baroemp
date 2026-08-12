import { getOccupationRepository } from "@/lib/repositories/occupation-repository";
import type { Occupation } from "@/types";

/**
 * user_job_interests.occupation_id는 occupations.id(UUID)를 참조하는 FK이지만,
 * 채용공고(Job)는 자유 코드인 jobCategory 문자열(예: "social_worker")만 가지고 있다.
 *
 * 여러 occupations row가 같은 job_category_code를 공유할 수 있으므로(예: "재가복지 사회복지사" /
 * "요양원 사회복지사"가 모두 social_worker), 이 함수는 "카테고리 단위 관심도"를 나타내는
 * 대표 occupation 1건을 결정론적으로 골라 반환한다 (매칭 없으면 null).
 */
export async function resolveOccupationForJobCategory(
  jobCategoryCode: string | undefined,
): Promise<Occupation | null> {
  if (!jobCategoryCode) return null;
  const all = await getOccupationRepository().findAll();
  const matches = all.filter((o) => o.jobCategoryCode === jobCategoryCode);
  if (matches.length === 0) return null;
  // 대표 occupation은 생성일 기준 가장 오래된(=시드에서 먼저 정의된) 것으로 고정한다.
  matches.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  return matches[0];
}
