import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthAnalyticsSnapshot } from "@/services/auth-analytics.service";
import { getSupportAnalyticsSnapshot } from "@/services/support-analytics.service";
import { getJobAnalyticsSnapshot } from "@/services/job-analytics.service";
import { activityEventLogger } from "@/lib/activity/event-logger";

const EVENT_LABELS: Record<string, string> = {
  login_completed: "로그인",
  signup_completed: "회원가입",
  assessment_started: "직업진단 시작",
  assessment_completed: "직업진단 완료",
  job_detail_viewed: "채용공고 조회",
  job_apply_clicked: "채용공고 지원 클릭",
  job_bookmarked: "채용공고 찜",
  support_viewed: "지원금 조회",
  support_apply_clicked: "지원금 신청 클릭",
  support_search_completed: "지원금진단 완료",
  resume_created: "이력서 작성 시작",
  resume_completed: "이력서 완성",
};

function timeAgo(iso: string): string {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default async function AdminDashboardPage() {
  const [auth, support, job, recentEvents] = await Promise.all([
    getAuthAnalyticsSnapshot(),
    getSupportAnalyticsSnapshot(),
    getJobAnalyticsSnapshot(),
    activityEventLogger.getRecentEvents(12),
  ]);

  const kpis = [
    ["전체 회원", `${auth.totalMembers}명`],
    ["신규가입 (7일)", `${auth.newMembersLast7d}명`],
    ["활성회원 (7일)", `${auth.activeMembersLast7d}명`],
    ["직업진단 완료", `${auth.funnel.assessmentCompleted}명`],
    ["채용공고 조회", `${job.jobViewCount}회`],
    ["지원금 조회", `${support.viewCount}회`],
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-title-3 font-bold text-slate-900">대시보드</h1>
        <p className="mt-1 text-label-1 text-slate-500">실제 회원·활동 데이터 기준 현황입니다.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([label, value]) => (
          <Card key={label} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-label-2 font-medium text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-title-2 font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 px-4 py-3">
            <CardTitle className="text-label-1">최근 활동</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-2">
            {recentEvents.length === 0 ? (
              <p className="py-6 text-center text-label-1 text-slate-400">아직 활동 기록이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2 text-label-1">
                    <span className="text-slate-700">{EVENT_LABELS[e.eventType] ?? e.eventType}</span>
                    <span className="text-label-2 text-slate-400">{timeAgo(e.occurredAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 px-4 py-3">
            <CardTitle className="text-label-1">바로가기</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <ul className="space-y-2 text-label-1">
              {(
                [
                  ["/admin/assessments", "내게 맞는 직업찾기 — 문항별 연령대 응답 분포"],
                  ["/admin/jobs", "전국 채용공고 — 공고 관리·동기화·클릭 분석"],
                  ["/admin/support", "지원금찾기 — 지원제도 동기화·관리"],
                  ["/admin/resumes", "이력서·자소서 첨삭 — 작성 현황"],
                  ["/admin/analytics", "전체 분석 — 퍼널·세그먼트 상세"],
                ] as const
              ).map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-brand-blue-600 hover:underline">
                    {label} →
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
