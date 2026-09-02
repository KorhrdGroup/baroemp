import { isPreferredQualification } from "@/lib/qualification";
import type { OccupationRecommendation } from "@/types";

/** 필수 자격(우대 제외)이 비어 있어 "준비하면 열리는" 트랙으로 가르는 기준. 카드의 걸림돌 판정과 같다. */
export function missesRequiredQualification(rec: OccupationRecommendation): boolean {
  return rec.requiredQualifications.some((q) => !isPreferredQualification(q) && rec.missingConditions.includes(q));
}

/**
 * 진단 추천을 두 트랙으로 가른다: 지금 조건으로 지원 가능한 직업 vs 자격을 갖추면 열리는 직업.
 * 준비 트랙은 총점에 자격 미보유 감점이 섞여 있으므로 성향(직무 적합도) 순으로 보여준다.
 * 결과 화면과 마이페이지가 같은 기준을 쓰기 위한 공용 모듈이다.
 */
export function splitRecommendationTracks(recommendations: OccupationRecommendation[]): {
  ready: OccupationRecommendation[];
  preparation: OccupationRecommendation[];
} {
  return {
    ready: recommendations.filter((rec) => !missesRequiredQualification(rec)),
    preparation: recommendations
      .filter(missesRequiredQualification)
      .sort((a, b) => b.dimensionFitScore - a.dimensionFitScore),
  };
}
