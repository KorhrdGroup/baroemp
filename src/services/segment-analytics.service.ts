import { activityEventLogger } from "@/lib/activity/event-logger";
import { getCareerProfileRepository, getOccupationRepository } from "@/lib/repositories";
import { labelAgeGroup, labelEmploymentStatus } from "@/lib/labels";
import type { AgeGroup, EmploymentStatus } from "@/types";

function topN(items: string[], n: number): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item) continue;
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export interface SegmentTopList {
  segment: string;
  items: { key: string; count: number }[];
}

export interface SegmentActivityRow {
  segment: string;
  memberCount: number;
  assessmentCompleted: number;
  jobViews: number;
  jobApplyClicks: number;
  supportViews: number;
}

export interface SegmentAnalyticsSnapshot {
  /** 연령대별 핵심 행동 요약 (진단 완료 / 채용 조회·지원 / 지원금 조회) */
  ageGroupActivity: SegmentActivityRow[];
  /** 취업상태별 핵심 행동 요약 */
  employmentStatusActivity: SegmentActivityRow[];
  /** 연령대별 - 채용공고에서 많이 본 직종 TOP */
  topJobCategoriesByAgeGroup: SegmentTopList[];
  /** 취업상태별 - 채용공고에서 많이 본 직종 TOP */
  topJobCategoriesByEmploymentStatus: SegmentTopList[];
  /** 연령대별 - 많이 본 지원금 TOP */
  topSupportProgramsByAgeGroup: SegmentTopList[];
  /** 연령대별 - 직업진단 결과에서 많이 클릭한 직업 TOP */
  topClickedOccupationsByAgeGroup: SegmentTopList[];
}

/**
 * /admin/analytics "세그먼트 분석" 섹션용.
 * activity_events를 career_profiles(연령대/취업상태)와 조인해
 * "어떤 유형의 사람이 무엇을 눌렀는지"를 집계한다.
 * 비로그인(anonymous) 이벤트는 프로필이 없으므로 "비로그인" 세그먼트로 묶는다.
 */
export async function getSegmentAnalyticsSnapshot(): Promise<SegmentAnalyticsSnapshot> {
  const [events, careerProfiles, occupations] = await Promise.all([
    activityEventLogger.getRecentEvents(5000),
    getCareerProfileRepository().findAll({}),
    getOccupationRepository().findAll(),
  ]);

  const ageByUser = new Map<string, AgeGroup | undefined>();
  const statusByUser = new Map<string, EmploymentStatus | undefined>();
  for (const cp of careerProfiles) {
    ageByUser.set(cp.userId, cp.ageGroup);
    statusByUser.set(cp.userId, cp.employmentStatus);
  }
  const occupationNameById = new Map(occupations.map((o) => [o.id, o.name]));

  const ANON = "비로그인";
  const UNKNOWN = "미입력";
  const ageSegment = (userId?: string | null): string => {
    if (!userId) return ANON;
    const age = ageByUser.get(userId);
    return age ? labelAgeGroup(age) : UNKNOWN;
  };
  const statusSegment = (userId?: string | null): string => {
    if (!userId) return ANON;
    const status = statusByUser.get(userId);
    return status ? labelEmploymentStatus(status) : UNKNOWN;
  };

  const jobViewEvents = events.filter((e) => e.eventType === "job_detail_viewed");
  const jobApplyEvents = events.filter((e) => e.eventType === "job_apply_clicked");
  const supportViewEvents = events.filter((e) => e.eventType === "support_viewed");
  const assessmentCompletedEvents = events.filter((e) => e.eventType === "assessment_completed");
  const occupationClickEvents = events.filter((e) => e.eventType === "occupation_result_clicked");

  function buildActivityRows(segmentOf: (userId?: string | null) => string): SegmentActivityRow[] {
    const rows = new Map<string, SegmentActivityRow>();
    const row = (segment: string): SegmentActivityRow => {
      let r = rows.get(segment);
      if (!r) {
        r = { segment, memberCount: 0, assessmentCompleted: 0, jobViews: 0, jobApplyClicks: 0, supportViews: 0 };
        rows.set(segment, r);
      }
      return r;
    };
    const seenUsers = new Map<string, string>();
    for (const e of [...jobViewEvents, ...jobApplyEvents, ...supportViewEvents, ...assessmentCompletedEvents]) {
      const actor = e.userId ?? e.anonymousId ?? "";
      if (actor && !seenUsers.has(actor)) seenUsers.set(actor, segmentOf(e.userId));
    }
    for (const segment of seenUsers.values()) row(segment).memberCount += 1;
    for (const e of assessmentCompletedEvents) row(segmentOf(e.userId)).assessmentCompleted += 1;
    for (const e of jobViewEvents) row(segmentOf(e.userId)).jobViews += 1;
    for (const e of jobApplyEvents) row(segmentOf(e.userId)).jobApplyClicks += 1;
    for (const e of supportViewEvents) row(segmentOf(e.userId)).supportViews += 1;
    return [...rows.values()].sort((a, b) => b.jobViews + b.supportViews - (a.jobViews + a.supportViews));
  }

  function buildSegmentTop(
    source: typeof events,
    segmentOf: (userId?: string | null) => string,
    keyOf: (e: (typeof events)[number]) => string,
  ): SegmentTopList[] {
    const bySegment = new Map<string, string[]>();
    for (const e of source) {
      const segment = segmentOf(e.userId);
      const key = keyOf(e);
      if (!key) continue;
      const list = bySegment.get(segment) ?? [];
      list.push(key);
      bySegment.set(segment, list);
    }
    return [...bySegment.entries()]
      .map(([segment, keys]) => ({ segment, items: topN(keys, 5) }))
      .sort((a, b) => b.items.reduce((s, i) => s + i.count, 0) - a.items.reduce((s, i) => s + i.count, 0));
  }

  return {
    ageGroupActivity: buildActivityRows(ageSegment),
    employmentStatusActivity: buildActivityRows(statusSegment),
    topJobCategoriesByAgeGroup: buildSegmentTop(jobViewEvents, ageSegment, (e) =>
      typeof e.metadata?.jobCategory === "string" ? e.metadata.jobCategory : "",
    ),
    topJobCategoriesByEmploymentStatus: buildSegmentTop(jobViewEvents, statusSegment, (e) =>
      typeof e.metadata?.jobCategory === "string" ? e.metadata.jobCategory : "",
    ),
    topSupportProgramsByAgeGroup: buildSegmentTop(supportViewEvents, ageSegment, (e) =>
      typeof e.metadata?.title === "string" ? e.metadata.title : "",
    ),
    topClickedOccupationsByAgeGroup: buildSegmentTop(occupationClickEvents, ageSegment, (e) =>
      e.entityId ? (occupationNameById.get(e.entityId) ?? e.entityId) : "",
    ),
  };
}
