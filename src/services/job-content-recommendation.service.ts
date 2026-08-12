import { listContents } from "./content.service";
import type { CareerContent } from "@/types";

/**
 * Job → Content Recommendation.
 *
 * Content.recommendationRules.excludeIfHeldQualificationIds 는 "이 자격을 이미 보유하면
 * 추천 제외" 라는 의미이므로, 반대로 해당 자격이 job.preferredQualifications에 있고
 * 사용자가 아직 보유하지 않았다면 "이 자격을 취득할 수 있는 콘텐츠"로 재사용할 수 있다.
 * 별도의 자격 ↔ 콘텐츠 매핑 테이블을 새로 만들지 않고 기존 Content Catalog 규칙을 그대로 활용한다.
 */
export async function findContentForMissingQualifications(
  missingQualificationCodes: string[],
): Promise<CareerContent[]> {
  if (missingQualificationCodes.length === 0) return [];
  const codeSet = new Set(missingQualificationCodes);
  const contents = await listContents({ status: "published" });
  return contents.filter((content) =>
    content.recommendationRules?.excludeIfHeldQualificationIds?.some((code) => codeSet.has(code)),
  );
}
