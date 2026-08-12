import type { AnalyticsSnapshot } from "@/types";
import { mockAdminUsers } from "@/mocks/users.mock";
import { mockActivityEvents } from "@/mocks/activity-events.mock";
import { mockLeads } from "@/mocks/leads.mock";
import { getDataSourceMode } from "@/lib/data/mode";

function countBy(items: string[]): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * STEP 2 Analytics — Card/Table 중심 기본 집계.
 * Mock Mode 에서는 Seed 데이터 기준, Supabase Mode 에서는 동일 인터페이스로 확장 가능.
 */
export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const mode = getDataSourceMode();

  const assessmentCompleted = mockActivityEvents.filter((e) =>
    e.eventType.includes("ASSESSMENT"),
  ).length;
  const supportViews = mockActivityEvents.filter((e) => e.eventType.includes("SUPPORT")).length;
  const jobViews = mockActivityEvents.filter((e) => e.eventType.includes("JOB")).length;
  const resumeReviews = mockActivityEvents.filter((e) => e.eventType.includes("RESUME")).length;
  const consultations = mockActivityEvents.filter((e) =>
    e.eventType.includes("CONSULTATION"),
  ).length;

  const gradeA = mockLeads.filter((l) => l.score.grade === "A").length;
  const gradeB = mockLeads.filter((l) => l.score.grade === "B").length;

  const utmSourceCounts = countBy(mockAdminUsers.map((u) => u.signupChannel));

  const campaignByUser = mockAdminUsers.map((u) => {
    const campaign =
      u.signupChannel === "google"
        ? "spring_reemployment"
        : u.signupChannel === "kakao"
          ? "care_worker_ads"
          : "brand_search";
    return { campaign, score: u.leadScore ?? 0 };
  });

  const utmCampaignCounts = countBy(campaignByUser.map((c) => c.campaign));

  const campaignScoreMap = new Map<string, { sum: number; count: number }>();
  for (const row of campaignByUser) {
    const prev = campaignScoreMap.get(row.campaign) ?? { sum: 0, count: 0 };
    campaignScoreMap.set(row.campaign, {
      sum: prev.sum + row.score,
      count: prev.count + 1,
    });
  }

  return {
    kpis: [
      { key: "new_members", label: "신규회원", value: `${mockAdminUsers.length}명` },
      { key: "active_members", label: "활성회원", value: `${Math.round(mockAdminUsers.length * 0.7)}명` },
      { key: "assessment_completed", label: "검사완료", value: `${assessmentCompleted}건` },
      { key: "support_views", label: "지원금조회", value: `${supportViews}회` },
      { key: "job_views", label: "채용공고조회", value: `${jobViews}회` },
      { key: "resume_reviews", label: "이력서첨삭", value: `${resumeReviews}건` },
      { key: "consultations", label: "상담신청", value: `${consultations}건` },
      { key: "grade_a", label: "A Lead", value: `${gradeA}명` },
      { key: "grade_b", label: "B Lead", value: `${gradeB}명` },
      { key: "data_mode", label: "데이터 모드", value: mode },
    ],
    utmSourceCounts,
    utmCampaignCounts,
    utmCampaignAvgLeadScore: [...campaignScoreMap.entries()].map(([key, v]) => ({
      key,
      avgScore: Math.round(v.sum / v.count),
      count: v.count,
    })),
  };
}
