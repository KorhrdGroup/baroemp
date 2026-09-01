import { findCareerProfileByUserId, getCareerProfileRepository, getUserQualificationRepository } from "@/lib/repositories";
import type { CareerProfile, CareerProfileInput } from "@/types";

const UNION_ARRAY_FIELDS = ["heldQualifications", "interestedQualifications", "desiredJobCategories"] as const;

/**
 * Career Profile 덮어쓰기 정책 (검사 결과 반영용).
 *
 * - 값이 없던 필드는 새 값으로 채운다.
 * - 검사에서 새로 얻은 단일값 필드(취업상태/희망시기/지역/급여 등)는 "최신 정보"로 간주해 갱신한다.
 * - 배열형 필드(자격/관심 태그 등)는 기존 값을 덮어쓰지 않고 합집합으로 병합한다.
 *
 * 정책을 바꾸고 싶다면 이 함수만 수정하면 된다 (호출부는 변경할 필요 없음).
 */
export function applyCareerProfileUpdatePolicy(
  existing: CareerProfile | null,
  incoming: CareerProfileInput,
): CareerProfileInput {
  const merged: CareerProfileInput = { ...incoming };
  if (!existing) return merged;

  for (const field of UNION_ARRAY_FIELDS) {
    const existingArr = existing[field];
    const incomingArr = incoming[field];
    if (existingArr?.length || incomingArr?.length) {
      merged[field] = [...new Set([...(existingArr ?? []), ...(incomingArr ?? [])])];
    }
  }

  if (existing.interestTags?.length || incoming.interestTags?.length) {
    merged.interestTags = [...new Set([...(existing.interestTags ?? []), ...(incoming.interestTags ?? [])])];
  }
  if (existing.employmentBarriers?.length || incoming.employmentBarriers?.length) {
    merged.employmentBarriers = [
      ...new Set([...(existing.employmentBarriers ?? []), ...(incoming.employmentBarriers ?? [])]),
    ];
  }

  return merged;
}

/**
 * 진단에서 답한 보유 자격을 Career DB(user_qualifications)로 승격한다.
 *
 * career_profiles에는 heldQualifications 컬럼이 없어서(조인 테이블 구조), 여기로 승격하지
 * 않으면 진단 답변이 assessment_results JSON에만 남는다. 공고 자격 배지·"지금 지원가능" 판정은
 * user_qualifications를 읽으므로, 이 승격이 있어야 진단에서 밝힌 자격이 매칭에 반영된다.
 */
export async function promoteAssessmentQualifications(userId: string, names: string[]): Promise<void> {
  const repo = getUserQualificationRepository();
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  for (const name of unique) {
    await repo.upsertFromAssessment({ userId, name });
  }
}

export async function mergeCareerProfileFromAssessment(
  userId: string,
  extracted: CareerProfileInput,
): Promise<CareerProfile> {
  const repo = getCareerProfileRepository();
  const existing = await findCareerProfileByUserId(userId);
  const merged = applyCareerProfileUpdatePolicy(existing, extracted);

  if (existing) {
    const updated = await repo.update(existing.id, merged);
    return updated ?? existing;
  }
  return repo.create({ ...merged, userId });
}
