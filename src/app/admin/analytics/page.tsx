import { BarChart3 } from "lucide-react";
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
import { getAnalyticsSnapshot } from "@/services/analytics.service";
import { getJobAnalyticsSnapshot } from "@/services/job-analytics.service";
import { getSupportAnalyticsSnapshot } from "@/services/support-analytics.service";
import { getAuthAnalyticsSnapshot } from "@/services/auth-analytics.service";
import { getResumeAnalyticsSnapshot } from "@/services/resume-analytics.service";
import { getCareerGapAnalyticsSnapshot } from "@/services/career-gap-analytics.service";

export default async function AdminAnalyticsPage() {
  const [snapshot, jobSnapshot, supportSnapshot, authSnapshot, resumeSnapshot, careerGapSnapshot] = await Promise.all([
    getAnalyticsSnapshot(),
    getJobAnalyticsSnapshot(),
    getSupportAnalyticsSnapshot(),
    getAuthAnalyticsSnapshot(),
    getResumeAnalyticsSnapshot(),
    getCareerGapAnalyticsSnapshot(),
  ]);

  return (
    <AdminPageShell
      title="분석"
      description="Activity Event · Lead Score · UTM 유입 기본 분석 (STEP 2)"
      icon={BarChart3}
    >
      <h2 className="text-[15px] font-bold text-slate-800">
        Auth / Member-first 지표 (STEP 6, 실데이터)
      </h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["전체 회원 수", `${authSnapshot.totalMembers}명`],
            ["신규가입 (7일/30일)", `${authSnapshot.newMembersLast7d}명 / ${authSnapshot.newMembersLast30d}명`],
            ["로그인 수 (7일/30일)", `${authSnapshot.loginsLast7d}건 / ${authSnapshot.loginsLast30d}건`],
            ["활성회원 (7일/30일)", `${authSnapshot.activeMembersLast7d}명 / ${authSnapshot.activeMembersLast30d}명`],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-[12px] font-medium text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 px-4 py-3">
            <CardTitle className="text-[14px]">
              Member-first Funnel (방문→가입→직업진단→채용조회→지원금진단)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>단계</TableHead>
                  <TableHead>회원 수</TableHead>
                  <TableHead>전체 대비</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  [
                    ["회원가입", authSnapshot.funnel.totalMembers],
                    ["직업진단 시작", authSnapshot.funnel.assessmentStarted],
                    ["직업진단 완료", authSnapshot.funnel.assessmentCompleted],
                    ["채용공고 조회", authSnapshot.funnel.jobViewed],
                    ["지원금진단 시작", authSnapshot.funnel.supportStarted],
                    ["지원금진단 완료", authSnapshot.funnel.supportCompleted],
                  ] as const
                ).map(([label, count]) => (
                  <TableRow key={label} className="text-[13px]">
                    <TableCell>{label}</TableCell>
                    <TableCell className="font-semibold">{count}명</TableCell>
                    <TableCell className="text-slate-500">
                      {authSnapshot.funnel.totalMembers > 0
                        ? `${Math.round((count / authSnapshot.funnel.totalMembers) * 100)}%`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 px-4 py-3">
            <CardTitle className="text-[14px]">utm_source별 실제 가입 회원 수 (user_acquisition)</CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>source</TableHead>
                  <TableHead>회원 수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authSnapshot.signupsByUtmSource.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-400">
                      데이터 없음
                    </TableCell>
                  </TableRow>
                ) : (
                  authSnapshot.signupsByUtmSource.map((row) => (
                    <TableRow key={row.key} className="text-[13px]">
                      <TableCell>{row.key}</TableCell>
                      <TableCell className="font-semibold">{row.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <h2 className="mt-8 text-[15px] font-bold text-slate-800">
        STEP 2 기본 지표
        <span className="ml-2 text-[12px] font-normal text-slate-400">
          (일부 카드는 STEP1 mock 데이터 기준 — 완료보고 참고)
        </span>
      </h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {snapshot.kpis.map((kpi) => (
          <Card
            key={kpi.key}
            className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200"
          >
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-[12px] font-medium text-slate-500">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 px-4 py-3">
            <CardTitle className="text-[14px]">utm_source별 회원 수</CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>source</TableHead>
                  <TableHead>회원 수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.utmSourceCounts.map((row) => (
                  <TableRow key={row.key} className="text-[13px]">
                    <TableCell>{row.key}</TableCell>
                    <TableCell className="font-semibold">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 px-4 py-3">
            <CardTitle className="text-[14px]">utm_campaign별 회원 수</CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>campaign</TableHead>
                  <TableHead>회원 수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.utmCampaignCounts.map((row) => (
                  <TableRow key={row.key} className="text-[13px]">
                    <TableCell>{row.key}</TableCell>
                    <TableCell className="font-semibold">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 px-4 py-3">
            <CardTitle className="text-[14px]">campaign별 평균 Lead Score</CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>campaign</TableHead>
                  <TableHead>평균</TableHead>
                  <TableHead>n</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.utmCampaignAvgLeadScore.map((row) => (
                  <TableRow key={row.key} className="text-[13px]">
                    <TableCell>{row.key}</TableCell>
                    <TableCell className="font-semibold text-brand-blue-600">
                      {row.avgScore}
                    </TableCell>
                    <TableCell>{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {(
          [
            ["채용검색 사용자 수", `${jobSnapshot.searchUserCount}명`],
            ["채용공고 조회 수", `${jobSnapshot.jobViewCount}회`],
            ["찜 수", `${jobSnapshot.bookmarkCount}건`],
            ["지원클릭 수", `${jobSnapshot.applyClickCount}건`],
            [
              "검사 추천 vs 실제 조회 일치율",
              jobSnapshot.assessmentToJobMatchRate.total > 0
                ? `${jobSnapshot.assessmentToJobMatchRate.ratePercent}% (${jobSnapshot.assessmentToJobMatchRate.matched}/${jobSnapshot.assessmentToJobMatchRate.total})`
                : "데이터 부족",
            ],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-[12px] font-medium text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        {(
          [
            ["TOP 검색어", jobSnapshot.topSearchKeywords],
            ["TOP 검색지역", jobSnapshot.topSearchRegions],
            ["TOP 찜 직종", jobSnapshot.topBookmarkedOccupations],
            ["TOP 지원 직종", jobSnapshot.topAppliedOccupations],
          ] as const
        ).map(([title, rows]) => (
          <Card key={title} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="border-b border-slate-100 px-4 py-3">
              <CardTitle className="text-[14px]">{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목</TableHead>
                    <TableHead>건수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-slate-400">
                        데이터 없음
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.key} className="text-[13px]">
                        <TableCell>{row.key}</TableCell>
                        <TableCell className="font-semibold">{row.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 text-[15px] font-bold text-slate-800">지원금 지표 (STEP 5)</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {(
          [
            ["지원금 검사 시작", `${supportSnapshot.searchStartedCount}건`],
            ["완료", `${supportSnapshot.searchCompletedCount}건`],
            ["완료율", `${supportSnapshot.completionRatePercent}%`],
            ["지원제도 조회", `${supportSnapshot.viewCount}회`],
            ["찜", `${supportSnapshot.bookmarkCount}건`],
            ["공식 신청 클릭", `${supportSnapshot.applyClickCount}건`],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-[12px] font-medium text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(
          [
            ["교육지원 관심자 수", `${supportSnapshot.trainingInterestCount}명`],
            ["지원금 검사완료자 평균 Lead Score", `${supportSnapshot.avgLeadScoreOfCompletedUsers}점`],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-[12px] font-medium text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        {(
          [
            ["TOP 지원유형", supportSnapshot.topCategories],
            ["TOP 지원사업", supportSnapshot.topPrograms],
            ["연령별 관심지원", supportSnapshot.topAgeGroups],
            ["지역별 관심지원", supportSnapshot.topRegions],
          ] as const
        ).map(([title, rows]) => (
          <Card key={title} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="border-b border-slate-100 px-4 py-3">
              <CardTitle className="text-[14px]">{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목</TableHead>
                    <TableHead>건수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-slate-400">
                        데이터 없음
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.key} className="text-[13px]">
                        <TableCell>{row.key}</TableCell>
                        <TableCell className="font-semibold">{row.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
      <h2 className="mt-8 text-[15px] font-bold text-slate-800">이력서·자기소개서 지표 (STEP 7)</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {(
          [
            ["이력서 생성회원", `${resumeSnapshot.resumeCreatingMemberCount}명`],
            ["완성이력서", `${resumeSnapshot.completedResumeCount}건`],
            ["평균 완성도", `${resumeSnapshot.averageCompleteness}%`],
            ["AI 첨삭 이용", `${resumeSnapshot.aiReviewUsageCount}건`],
            ["자소서 생성", `${resumeSnapshot.coverLetterCreatedCount}건`],
            ["공고연결 이력서", `${resumeSnapshot.jobLinkedResumeCount}건`],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-[12px] font-medium text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {(
          [
            ["Template별 작성수", resumeSnapshot.byTemplate],
            ["연령대별 완성이력서", resumeSnapshot.byAgeGroupCompletionRate],
          ] as const
        ).map(([title, rows]) => (
          <Card key={title} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="border-b border-slate-100 px-4 py-3">
              <CardTitle className="text-[14px]">{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목</TableHead>
                    <TableHead>건수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-slate-400">
                        데이터 없음
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.key} className="text-[13px]">
                        <TableCell>{row.key}</TableCell>
                        <TableCell className="font-semibold">{row.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 text-[15px] font-bold text-slate-800">
        취업 준비도(Career Gap) 지표 (STEP 7.5)
        <span className="ml-2 text-[12px] font-normal text-slate-400">
          직업/취업처별 상세 시장분석은 취업 준비도 시장분석 메뉴에서 확인하세요.
        </span>
      </h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {(
          [
            ["분석 회원 수", `${careerGapSnapshot.uniqueUserCount}명`],
            ["총 분석 건수", `${careerGapSnapshot.totalAnalyses}건`],
            ["평균 준비도", `${careerGapSnapshot.averageReadinessScore}점`],
            ["자격 부족률", `${careerGapSnapshot.qualificationDeficiencyRatePercent}%`],
            ["Skill 부족률", `${careerGapSnapshot.skillDeficiencyRatePercent}%`],
            ["이력서 부족률(추정)", `${careerGapSnapshot.resumeDeficiencyRatePercent}%`],
          ] as const
        ).map(([label, value]) => (
          <Card key={label} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-[12px] font-medium text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 px-4 py-3">
            <CardTitle className="text-[14px]">직업/취업처별 분석 현황</CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>직업/취업처</TableHead>
                  <TableHead>분석 건수</TableHead>
                  <TableHead>평균 준비도</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {careerGapSnapshot.byTarget.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-400">
                      데이터 없음
                    </TableCell>
                  </TableRow>
                ) : (
                  careerGapSnapshot.byTarget.map((row) => (
                    <TableRow key={row.key} className="text-[13px]">
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="font-semibold">{row.analysisCount}건</TableCell>
                      <TableCell className="font-semibold text-brand-blue-600">{row.averageReadinessScore}점</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 px-4 py-3">
            <CardTitle className="text-[14px]">가장 많이 부족한 조건 (TOP)</CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>조건</TableHead>
                  <TableHead>부족 건수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {careerGapSnapshot.topGapRequirements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-400">
                      데이터 없음
                    </TableCell>
                  </TableRow>
                ) : (
                  careerGapSnapshot.topGapRequirements.map((row) => (
                    <TableRow key={row.requirementId} className="text-[13px]">
                      <TableCell>{row.requirementName}</TableCell>
                      <TableCell className="font-semibold">{row.gapCount}건</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
