import { activityEventLogger } from "@/lib/activity/event-logger";
import { extractSupportInterestTags, SUPPORT_TAG_REPEAT_THRESHOLD } from "@/lib/support/support-tag-rules";
import { findContentForMissingQualifications } from "./job-content-recommendation.service";
import { mergeCareerProfileFromAssessment } from "./career-profile-merge.service";
import type { CareerContent, CareerProfile, SupportProgram } from "@/types";

async function countTagOccurrences(userId: string, tag: string): Promise<number> {
  const events = await activityEventLogger.getEventsByUser(userId);
  return events.filter(
    (e) =>
      (e.eventType === "support_viewed" || e.eventType === "support_bookmarked") &&
      Array.isArray(e.metadata?.tags) &&
      (e.metadata!.tags as string[]).includes(tag),
  ).length;
}

/**
 * Support Interest (스펙 17번): 사용자가 반복 조회하는 지원제도 유형에서 관심 태그를 추론해
 * Career Profile.interestTags에 승격한다. job-interest.service.ts의 detailTags 승격 로직과 동일한 철학.
 *
 * 비회원은 로컬 신호만 쌓이고(Activity Event는 anonymousId로 기록됨) Career Profile이 없으므로
 * 태그 승격은 회원가입 이후로 미룬다.
 */
export async function promoteSupportInterestTags(userId: string, program: SupportProgram): Promise<string[]> {
  const tags = extractSupportInterestTags(program);
  if (tags.length === 0) return [];

  const promoted: string[] = [];
  for (const tag of tags) {
    const occurrences = await countTagOccurrences(userId, tag);
    if (occurrences + 1 >= SUPPORT_TAG_REPEAT_THRESHOLD) {
      promoted.push(`#${tag}`);
    }
  }
  if (promoted.length > 0) {
    await mergeCareerProfileFromAssessment(userId, { interestTags: promoted });
  }
  return promoted;
}

/**
 * Content Matching (스펙 18번): 지원제도에 관심을 보였고, 관련 자격/교육을 아직 보유하지 않은 경우에만
 * "함께 준비할 수 있는 과정"으로 관련 Content를 추천한다. 억지로 모든 지원제도에 Content를 붙이지 않는다.
 */
export async function getRelatedContentForSupportProgram(
  program: SupportProgram,
  profile?: CareerProfile,
): Promise<CareerContent[]> {
  if (program.category !== "training") return [];
  if (!program.relatedQualificationCodes || program.relatedQualificationCodes.length === 0) return [];

  const heldSet = new Set(profile?.heldQualifications ?? []);
  const missing = program.relatedQualificationCodes.filter((code) => !heldSet.has(code));
  if (missing.length === 0) return [];

  return findContentForMissingQualifications(missing);
}
