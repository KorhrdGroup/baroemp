import { BarChart3 } from "lucide-react";
import type { ReactNode } from "react";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getJobAnalyticsSnapshot } from "@/services/job-analytics.service";
import { getSupportAnalyticsSnapshot } from "@/services/support-analytics.service";
import { getAuthAnalyticsSnapshot } from "@/services/auth-analytics.service";
import { getResumeAnalyticsSnapshot } from "@/services/resume-analytics.service";
import { getCareerGapAnalyticsSnapshot } from "@/services/career-gap-analytics.service";
import { getSegmentAnalyticsSnapshot } from "@/services/segment-analytics.service";

/* ---------------------------------------------------------------- */
/* 화면 구성 요소 (이 페이지 전용)                                     */
/* ---------------------------------------------------------------- */

const SECTIONS = [
  { id: "overview", label: "한눈에 보기" },
  { id: "funnel", label: "회원 여정" },
  { id: "segment", label: "누가 무엇을 보나" },
  { id: "jobs", label: "채용공고" },
  { id: "support", label: "지원금" },
  { id: "resume", label: "이력서" },
  { id: "readiness", label: "취업 준비도" },
] as const;

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24 first:mt-0">
      <div className="border-b-2 border-brand-blue-500 pb-2">
        <h2 className="text-body-1 font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-label-2 text-slate-500">{subtitle}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatGrid({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map(([label, value]) => (
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
  );
}

/** 순위 목록: 건수를 막대 길이로 보여줘서 표보다 한눈에 비교되게 한다. */
function RankCard({
  title,
  rows,
  unit = "건",
}: {
  title: string;
  rows: { key: string; count: number }[];
  unit?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
      <CardHeader className="border-b border-slate-100 px-4 py-3">
        <CardTitle className="text-label-1">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-label-1 text-slate-400">아직 데이터가 없습니다</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.key}>
                <div className="flex items-baseline justify-between gap-2 text-label-1">
                  <span className="truncate text-slate-700">{row.key}</span>
                  <span className="shrink-0 font-semibold text-slate-900">
                    {row.count}
                    {unit}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-brand-blue-500"
                    style={{ width: `${Math.max(4, Math.round((row.count / max) * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** 세그먼트(연령대 등)별 TOP 목록 묶음 카드 */
function SegmentRankCard({
  title,
  groups,
}: {
  title: string;
  groups: { segment: string; items: { key: string; count: number }[] }[];
}) {
  return (
    <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
      <CardHeader className="border-b border-slate-100 px-4 py-3">
        <CardTitle className="text-label-1">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">
        {groups.length === 0 ? (
          <p className="py-4 text-center text-label-1 text-slate-400">아직 데이터가 없습니다</p>
        ) : (
          groups.map((group) => (
            <div key={group.segment} className="border-b border-slate-100 py-2 last:border-b-0">
              <p className="text-label-1 font-semibold text-brand-blue-600">{group.segment}</p>
              <ul className="mt-1 space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.key} className="flex justify-between text-label-2 text-slate-600">
                    <span className="truncate pr-2">{item.key}</span>
                    <span className="shrink-0 font-semibold">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- */

export default async function AdminAnalyticsPage() {
  const [jobSnapshot, supportSnapshot, authSnapshot, resumeSnapshot, careerGapSnapshot, segmentSnapshot] =
    await Promise.all([
      getJobAnalyticsSnapshot(),
      getSupportAnalyticsSnapshot(),
      getAuthAnalyticsSnapshot(),
      getResumeAnalyticsSnapshot(),
      getCareerGapAnalyticsSnapshot(),
      getSegmentAnalyticsSnapshot(),
    ]);

  const funnelRows = [
    ["회원가입", authSnapshot.funnel.totalMembers],
    ["직업진단 시작", authSnapshot.funnel.assessmentStarted],
    ["직업진단 완료", authSnapshot.funnel.assessmentCompleted],
    ["채용공고 조회", authSnapshot.funnel.jobViewed],
    ["지원금진단 시작", authSnapshot.funnel.supportStarted],
    ["지원금진단 완료", authSnapshot.funnel.supportCompleted],
  ] as const;
  const funnelMax = Math.max(1, authSnapshot.funnel.totalMembers);

  return (
    <AdminPageShell
      title="분석"
      description="회원들이 서비스에서 무엇을 하는지 실데이터 기준으로 보여줍니다."
      icon={BarChart3}
    >
      {/* 섹션 바로가기 */}
      <nav className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-1.5 bg-slate-50/95 px-1 py-2 backdrop-blur">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full bg-white px-3 py-1 text-label-2 font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-brand-blue-50 hover:text-brand-blue-600"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <Section id="overview" title="한눈에 보기" subtitle="회원 규모와 최근 활동">
        <StatGrid
          items={[
            ["전체 회원", `${authSnapshot.totalMembers}명`],
            ["신규가입 (7일)", `${authSnapshot.newMembersLast7d}명`],
            ["신규가입 (30일)", `${authSnapshot.newMembersLast30d}명`],
            ["로그인 (7일)", `${authSnapshot.loginsLast7d}건`],
            ["활성회원 (7일)", `${authSnapshot.activeMembersLast7d}명`],
            ["활성회원 (30일)", `${authSnapshot.activeMembersLast30d}명`],
          ]}
        />
      </Section>

      <Section
        id="funnel"
        title="회원 여정 (Funnel)"
        subtitle="가입한 회원이 어디까지 진행했는지 — 막대가 짧아지는 단계가 이탈 지점입니다"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardContent className="px-4 py-4">
              <ul className="space-y-3">
                {funnelRows.map(([label, count]) => (
                  <li key={label}>
                    <div className="flex items-baseline justify-between text-label-1">
                      <span className="text-slate-700">{label}</span>
                      <span className="font-semibold text-slate-900">
                        {count}명
                        <span className="ml-1.5 text-label-2 font-normal text-slate-400">
                          {Math.round((count / funnelMax) * 100)}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 rounded-full bg-slate-100">
                      <div
                        className="h-2.5 rounded-full bg-brand-blue-500"
                        style={{ width: `${Math.max(2, Math.round((count / funnelMax) * 100))}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <RankCard title="유입경로별 가입 회원 (utm_source)" rows={authSnapshot.signupsByUtmSource} unit="명" />
        </div>
      </Section>

      <Section
        id="segment"
        title="누가 무엇을 보나 (세그먼트)"
        subtitle="연령대·취업상태별로 어떤 행동을 했고 무엇을 눌렀는지"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {(
            [
              ["연령대별 행동 요약", segmentSnapshot.ageGroupActivity],
              ["취업상태별 행동 요약", segmentSnapshot.employmentStatusActivity],
            ] as const
          ).map(([title, rows]) => (
            <Card key={title} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
              <CardHeader className="border-b border-slate-100 px-4 py-3">
                <CardTitle className="text-label-1">{title}</CardTitle>
              </CardHeader>
              <CardContent className="px-0 py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>구분</TableHead>
                      <TableHead>활동자</TableHead>
                      <TableHead>진단완료</TableHead>
                      <TableHead>공고조회</TableHead>
                      <TableHead>지원클릭</TableHead>
                      <TableHead>지원금조회</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400">
                          아직 데이터가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={row.segment} className="text-label-1">
                          <TableCell className="font-medium">{row.segment}</TableCell>
                          <TableCell>{row.memberCount}</TableCell>
                          <TableCell>{row.assessmentCompleted}</TableCell>
                          <TableCell>{row.jobViews}</TableCell>
                          <TableCell>{row.jobApplyClicks}</TableCell>
                          <TableCell>{row.supportViews}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <SegmentRankCard title="연령대별 많이 본 직종 (채용공고)" groups={segmentSnapshot.topJobCategoriesByAgeGroup} />
          <SegmentRankCard title="연령대별 많이 본 지원금" groups={segmentSnapshot.topSupportProgramsByAgeGroup} />
          <SegmentRankCard
            title="연령대별 진단결과에서 클릭한 직업"
            groups={segmentSnapshot.topClickedOccupationsByAgeGroup}
          />
        </div>
      </Section>

      <Section id="jobs" title="채용공고" subtitle="검색·조회·찜·지원 행동">
        <StatGrid
          items={[
            ["검색 사용자", `${jobSnapshot.searchUserCount}명`],
            ["공고 조회", `${jobSnapshot.jobViewCount}회`],
            ["찜", `${jobSnapshot.bookmarkCount}건`],
            ["지원 클릭", `${jobSnapshot.applyClickCount}건`],
            [
              "진단추천 ↔ 실제조회 일치",
              jobSnapshot.assessmentToJobMatchRate.total > 0
                ? `${jobSnapshot.assessmentToJobMatchRate.ratePercent}%`
                : "데이터 부족",
            ],
          ]}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <RankCard title="많이 찾은 검색어" rows={jobSnapshot.topSearchKeywords} />
          <RankCard title="많이 찾은 지역" rows={jobSnapshot.topSearchRegions} />
          <RankCard title="많이 찜한 직종" rows={jobSnapshot.topBookmarkedOccupations} />
          <RankCard title="많이 지원한 직종" rows={jobSnapshot.topAppliedOccupations} />
        </div>
      </Section>

      <Section id="support" title="지원금" subtitle="지원금 진단·조회·신청 행동">
        <StatGrid
          items={[
            ["진단 시작", `${supportSnapshot.searchStartedCount}건`],
            ["진단 완료", `${supportSnapshot.searchCompletedCount}건`],
            ["완료율", `${supportSnapshot.completionRatePercent}%`],
            ["지원제도 조회", `${supportSnapshot.viewCount}회`],
            ["찜", `${supportSnapshot.bookmarkCount}건`],
            ["공식 신청 클릭", `${supportSnapshot.applyClickCount}건`],
          ]}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <RankCard title="인기 지원유형" rows={supportSnapshot.topCategories} />
          <RankCard title="인기 지원사업" rows={supportSnapshot.topPrograms} />
          <RankCard title="연령대별 관심" rows={supportSnapshot.topAgeGroups} />
          <RankCard title="지역별 관심" rows={supportSnapshot.topRegions} />
        </div>
      </Section>

      <Section id="resume" title="이력서·자기소개서" subtitle="작성·완성·AI 첨삭 이용 현황">
        <StatGrid
          items={[
            ["작성 회원", `${resumeSnapshot.resumeCreatingMemberCount}명`],
            ["완성 이력서", `${resumeSnapshot.completedResumeCount}건`],
            ["평균 완성도", `${resumeSnapshot.averageCompleteness}%`],
            ["AI 첨삭 이용", `${resumeSnapshot.aiReviewUsageCount}건`],
            ["자소서 생성", `${resumeSnapshot.coverLetterCreatedCount}건`],
            ["공고연결 이력서", `${resumeSnapshot.jobLinkedResumeCount}건`],
          ]}
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <RankCard title="템플릿별 작성 수" rows={resumeSnapshot.byTemplate} />
          <RankCard title="연령대별 완성 이력서" rows={resumeSnapshot.byAgeGroupCompletionRate} />
        </div>
      </Section>

      <Section
        id="readiness"
        title="취업 준비도 (Career Gap)"
        subtitle="직업/취업처별 상세 시장분석은 '취업 준비도 시장분석' 메뉴에서 확인하세요"
      >
        <StatGrid
          items={[
            ["분석 회원", `${careerGapSnapshot.uniqueUserCount}명`],
            ["총 분석", `${careerGapSnapshot.totalAnalyses}건`],
            ["평균 준비도", `${careerGapSnapshot.averageReadinessScore}점`],
            ["자격 부족률", `${careerGapSnapshot.qualificationDeficiencyRatePercent}%`],
            ["Skill 부족률", `${careerGapSnapshot.skillDeficiencyRatePercent}%`],
            ["이력서 부족률", `${careerGapSnapshot.resumeDeficiencyRatePercent}%`],
          ]}
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <RankCard
            title="많이 분석한 목표 직업"
            rows={careerGapSnapshot.byTarget.map((t) => ({ key: t.label, count: t.analysisCount }))}
          />
          <RankCard
            title="가장 많이 부족한 조건"
            rows={careerGapSnapshot.topGapRequirements.map((r) => ({ key: r.requirementName, count: r.gapCount }))}
          />
        </div>
      </Section>
    </AdminPageShell>
  );
}
