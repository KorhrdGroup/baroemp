import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Region, UserCrmDetail } from "@/types";
import {
  labelAgeGroup,
  labelDesiredStartTiming,
  labelLeadStatus,
  labelRegion,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { RecalculateLeadButton } from "./recalculate-lead-button";

function gradeClass(grade: string): string {
  if (grade === "A") return "bg-red-50 text-red-600";
  if (grade === "B") return "bg-amber-50 text-amber-700";
  if (grade === "C") return "bg-brand-blue-50 text-brand-blue-600";
  return "bg-slate-100 text-slate-500";
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
        <CardTitle className="text-[14px]">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="px-4 py-4">{children}</CardContent>
    </Card>
  );
}

export function UserCrmDetailView({ detail }: { detail: UserCrmDetail }) {
  const { profile, careerProfile, lead, acquisition } = detail;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/users" className="text-[12px] text-brand-blue-600 hover:underline">
            ← 회원 목록
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{profile.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
            <span>
              Career DB 상세 · {profile.email} · {profile.phone}
            </span>
            {/* 스펙 31번: Lead Grade와 완전히 별개 축. "영업 가능"이 아니라 "마케팅 수신 동의" 상태만 나타낸다. */}
            {profile.marketingConsent ? (
              <Badge className="rounded-md border-0 bg-brand-blue-50 text-[11px] text-brand-blue-700">마케팅 수신 동의</Badge>
            ) : (
              <Badge variant="outline" className="rounded-md text-[11px] text-slate-400">
                마케팅 수신 미동의
              </Badge>
            )}
          </p>
        </div>
        {lead && <RecalculateLeadButton userId={profile.id} />}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="A. 기본정보">
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="text-slate-400">이름</dt>
              <dd className="font-semibold">{profile.name}</dd>
            </div>
            <div>
              <dt className="text-slate-400">연령대</dt>
              <dd className="font-semibold">{labelAgeGroup(careerProfile?.ageGroup)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">지역</dt>
              <dd className="font-semibold">
                {labelRegion(careerProfile?.region) || profile.regionSido}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">연락처</dt>
              <dd className="font-semibold">{profile.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-400">가입일</dt>
              <dd className="font-semibold">{profile.createdAt.slice(0, 10)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">최근활동</dt>
              <dd className="font-semibold">{profile.lastActiveAt?.slice(0, 16) ?? "-"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-400">유입</dt>
              <dd className="font-semibold">
                {acquisition?.utmSource} / {acquisition?.utmCampaign}
              </dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="B. Lead">
          {lead ? (
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center gap-3">
                <Badge className={cn("rounded-md border-0 px-2 font-bold", gradeClass(lead.score.grade))}>
                  {lead.score.grade}
                </Badge>
                <span className="text-2xl font-bold text-slate-900">{lead.score.totalScore}</span>
                <span className="text-slate-500">{labelLeadStatus(lead.status)}</span>
              </div>
              <p className="text-slate-600">최근행동: {lead.recentActionLabel}</p>
              <div className="space-y-1 rounded-lg bg-slate-50 p-3">
                <p className="text-[12px] font-semibold text-slate-500">점수 상세 이유</p>
                {lead.score.signals
                  .filter((s) => s.active)
                  .map((s) => (
                    <div key={s.key} className="flex justify-between">
                      <span>{s.label}</span>
                      <span className="font-semibold text-brand-blue-600">+{s.points}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">Lead 정보 없음</p>
          )}
        </SectionCard>

        <SectionCard title="C. Career Profile">
          {careerProfile ? (
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-slate-400">취업상태</dt>
                <dd className="font-semibold">{careerProfile.employmentStatus}</dd>
              </div>
              <div>
                <dt className="text-slate-400">희망직업</dt>
                <dd className="font-semibold">
                  {careerProfile.desiredJobCategories?.join(", ") || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">희망급여</dt>
                <dd className="font-semibold">
                  {careerProfile.desiredSalaryMin}~{careerProfile.desiredSalaryMax}만원
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">희망취업시기</dt>
                <dd className="font-semibold">
                  {labelDesiredStartTiming(careerProfile.desiredStartTiming)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400">취업장벽</dt>
                <dd className="font-semibold">
                  {careerProfile.employmentBarriers?.join(", ") || "-"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-[13px] text-slate-500">Career Profile 없음</p>
          )}
        </SectionCard>

        <SectionCard title="D. 관심">
          <div className="space-y-3 text-[13px]">
            <div>
              <p className="mb-1 text-[12px] text-slate-400">관심직업</p>
              <div className="flex flex-wrap gap-1">
                {detail.interestedJobs.map((item) => (
                  <Badge key={item.id} variant="outline" className="rounded-md">
                    {item.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[12px] text-slate-400">보유자격</p>
              <div className="flex flex-wrap gap-1">
                {detail.heldQualifications.length ? (
                  detail.heldQualifications.map((item) => (
                    <Badge key={item.id} variant="secondary" className="rounded-md">
                      {item.label}
                    </Badge>
                  ))
                ) : (
                  <span className="text-slate-500">없음</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[12px] text-slate-400">관심자격</p>
              <div className="flex flex-wrap gap-1">
                {detail.interestedQualifications.map((item) => (
                  <Badge key={item.id} className="rounded-md bg-brand-blue-50 text-brand-blue-600">
                    {item.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[12px] text-slate-400">관심콘텐츠</p>
              <ul className="space-y-1">
                {detail.interestedContents.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.label}</span>
                    <span className="font-semibold">{item.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="채용 관심 (Job Behavior)">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-[12px] text-slate-400">최근 7일 공고조회</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{detail.jobBehavior.recentViewCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-[12px] text-slate-400">찜</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{detail.jobBehavior.bookmarkCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-[12px] text-slate-400">지원클릭</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{detail.jobBehavior.applyClickCount}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-500">TOP 관심직업 (실제 조회/찜/지원 기반)</p>
            {detail.jobBehavior.topInterestOccupations.length === 0 ? (
              <p className="text-[13px] text-slate-400">아직 데이터가 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {detail.jobBehavior.topInterestOccupations.map((item) => (
                  <li key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-bold text-brand-blue-600">{item.count}점</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-500">TOP 세부관심</p>
            <div className="flex flex-wrap gap-1.5">
              {detail.jobBehavior.topDetailTags.length === 0 ? (
                <span className="text-[13px] text-slate-400">아직 데이터가 없습니다.</span>
              ) : (
                detail.jobBehavior.topDetailTags.map((item) => (
                  <Badge key={item.label} variant="outline" className="rounded-md">
                    #{item.label}관심 {item.count}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-500">검색 키워드</p>
            <div className="flex flex-wrap gap-1.5">
              {detail.jobBehavior.searchKeywords.length === 0 ? (
                <span className="text-[13px] text-slate-400">없음</span>
              ) : (
                detail.jobBehavior.searchKeywords.map((kw) => (
                  <Badge key={kw} className="rounded-md bg-brand-blue-50 text-brand-blue-600">
                    {kw}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-500">지역 선호</p>
            <div className="flex flex-wrap gap-1.5">
              {detail.jobBehavior.topRegions.length === 0 ? (
                <span className="text-[13px] text-slate-400">없음</span>
              ) : (
                detail.jobBehavior.topRegions.map((item) => (
                  <Badge key={item.label} variant="secondary" className="rounded-md">
                    {labelRegion(item.label as Region) || item.label} {item.count}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        {detail.jobBehavior.topInterestOccupations[0] && detail.interestedJobs[0] && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            검사 관심(Assessment) TOP &ldquo;{detail.interestedJobs[0].label}&rdquo; vs 실제 조회(Job Behavior) TOP &ldquo;
            {detail.jobBehavior.topInterestOccupations[0].label}&rdquo;
            {detail.interestedJobs[0].label === detail.jobBehavior.topInterestOccupations[0].label
              ? " · 일치"
              : " · 불일치"}
          </p>
        )}
      </SectionCard>

      <SectionCard title="지원제도 관심 (Support Behavior)">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-[12px] text-slate-400">지원금 검사</p>
            <p className="mt-1 text-xl font-bold text-slate-800">
              {detail.supportBehavior.hasCompletedAssessment ? "완료" : "미완료"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-[12px] text-slate-400">높은 가능성 제도</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{detail.supportBehavior.highEligibilityCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-[12px] text-slate-400">최근 조회</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{detail.supportBehavior.recentViewCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-[12px] text-slate-400">찜</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{detail.supportBehavior.bookmarkCount}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-500">TOP 관심유형</p>
            {detail.supportBehavior.topCategories.length === 0 ? (
              <p className="text-[13px] text-slate-400">아직 데이터가 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {detail.supportBehavior.topCategories.map((item) => (
                  <li key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-bold text-brand-blue-600">{item.count}회</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-500">TOP 관심제도</p>
            {detail.supportBehavior.topPrograms.length === 0 ? (
              <p className="text-[13px] text-slate-400">아직 데이터가 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {detail.supportBehavior.topPrograms.map((item) => (
                  <li key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                    <span className="truncate font-medium text-slate-700">{item.label}</span>
                    <span className="shrink-0 font-bold text-brand-blue-600">{item.count}회</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px]">
          <span className="text-slate-400">신청클릭 · {detail.supportBehavior.applyClickCount}회</span>
          {detail.supportBehavior.lastAssessmentCompletedAt && (
            <span className="text-slate-400">
              최근 검사 · {detail.supportBehavior.lastAssessmentCompletedAt.slice(0, 10)}
            </span>
          )}
          {detail.supportBehavior.trainingInterest && (
            <Badge variant="outline" className="rounded-md">
              #교육지원관심
            </Badge>
          )}
          {detail.supportBehavior.regionalInterest && (
            <Badge variant="outline" className="rounded-md">
              #지역지원관심
            </Badge>
          )}
        </div>
      </SectionCard>

      {detail.assessmentResults.length > 0 && (
        <SectionCard title="검사 결과 (내게 맞는 직업 찾기)">
          <div className="space-y-5">
            {detail.assessmentResults.slice(0, 3).map((result, idx) => (
              <div key={result.id} className={cn("rounded-xl p-4", idx === 0 ? "bg-brand-blue-50/60" : "bg-slate-50")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-slate-500">
                    {idx === 0 ? "최근 검사" : "이전 검사"} · {result.completedAt.slice(0, 16).replace("T", " ")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.generatedTags.slice(0, 6).map((tag) => (
                      <Badge key={tag} variant="outline" className="rounded-md text-[11px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
                  {result.recommendations.slice(0, 5).map((rec, i) => (
                    <div key={rec.occupationId} className="rounded-lg bg-white p-3 ring-1 ring-slate-100">
                      <p className="text-[11px] text-slate-400">TOP{i + 1}</p>
                      <p className="text-[13px] font-semibold text-slate-800">{rec.occupationName}</p>
                      <p className="mt-1 text-[13px] font-bold text-brand-blue-600">{rec.totalScore}점</p>
                      <p className="text-[11px] text-slate-400">준비도 {rec.readinessScore}점</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {detail.assessmentResults.length > 3 && (
              <p className="text-[12px] text-slate-400">외 {detail.assessmentResults.length - 3}건의 검사 이력이 더 있습니다.</p>
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard title="E. 행동 (Activity Timeline)">
        <div className="space-y-2">
          {detail.activities.slice(0, 15).map((event) => (
            <div
              key={event.id}
              className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2 text-[13px] last:border-0"
            >
              <div>
                <p className="font-medium text-slate-800">
                  {String(event.metadata?.label ?? event.eventType)}
                </p>
                <p className="text-[12px] text-slate-400">
                  {event.entityType ?? "-"} {event.entityId ?? ""}
                </p>
              </div>
              <time className="shrink-0 text-[12px] text-slate-400">
                {event.occurredAt.replace("T", " ").slice(0, 16)}
              </time>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        {(
          [
            ["F. 추천 콘텐츠", detail.recommendedContents],
            ["추천 직업/채용", detail.recommendedJobs],
            ["추천 지원금", detail.recommendedSupports],
          ] as const
        ).map(([title, items]) => (
          <SectionCard key={title} title={title}>
            <div className="space-y-2 text-[13px]">
              {items.length === 0 && <p className="text-slate-500">추천 결과 없음</p>}
              {items.map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{item.title}</p>
                    <Badge className={cn("border-0", gradeClass(item.grade))}>{item.grade}</Badge>
                  </div>
                  <p className="mt-1 text-brand-blue-600">Score {item.score}</p>
                  <ul className="mt-1 text-[12px] text-slate-500">
                    {item.reasons.slice(0, 3).map((r) => (
                      <li key={r.ruleKey + r.label}>
                        {r.label} (+{r.score})
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard
        title="G. 상담"
        action={
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/consultations">상담관리</Link>
          </Button>
        }
      >
        {detail.consultations.length === 0 ? (
          <p className="text-[13px] text-slate-500">상담 이력 없음</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>채널</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>주제</TableHead>
                <TableHead>희망일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.consultations.map((c) => (
                <TableRow key={c.id} className="text-[13px]">
                  <TableCell>{c.channel}</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell>{c.requestedTopic ?? "-"}</TableCell>
                  <TableCell>{c.preferredAt?.slice(0, 16) ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <SectionCard
        title="H. 이력서/자소서"
        action={
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/resumes`}>Template 관리</Link>
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[12px] text-slate-400">이력서 수</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{detail.resumeSummary.resumeCount}</p>
          </div>
          <div>
            <p className="text-[12px] text-slate-400">자소서 수</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{detail.resumeSummary.coverLetterCount}</p>
          </div>
          <div>
            <p className="text-[12px] text-slate-400">대표이력서 완성도</p>
            <p className="mt-1 text-xl font-bold text-slate-800">
              {detail.resumeSummary.primaryResume ? `${detail.resumeSummary.primaryResume.completeness}%` : "-"}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-slate-400">최근 AI 첨삭일</p>
            <p className="mt-1 text-xl font-bold text-slate-800">
              {detail.resumeSummary.lastAiReviewedAt ? detail.resumeSummary.lastAiReviewedAt.slice(0, 10) : "-"}
            </p>
          </div>
        </div>
        {detail.resumeSummary.primaryResume ? (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[13px]">
            <p className="font-semibold text-slate-800">{detail.resumeSummary.primaryResume.title}</p>
            <p className="mt-1 text-slate-500">
              희망직무 {detail.resumeSummary.primaryResume.desiredJobTitle ?? "-"} · 최근수정{" "}
              {detail.resumeSummary.primaryResume.updatedAt.slice(0, 10)}
            </p>
            {detail.resumeSummary.targetJobIds.length > 0 && (
              <p className="mt-1 text-slate-400">지원대상 Job 연결 {detail.resumeSummary.targetJobIds.length}건</p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-slate-500">아직 작성한 이력서가 없습니다.</p>
        )}
      </SectionCard>

      <SectionCard title="I. Career Gap (취업 준비도)">
        {detail.careerGapSummaries.length === 0 ? (
          <p className="text-[13px] text-slate-500">아직 취업 준비도 분석 이력이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {detail.careerGapSummaries.map((summary) => (
              <div key={summary.id} className="rounded-lg bg-slate-50 p-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">
                    {summary.occupationName ?? "직업 미지정"}
                    {summary.destinationName ? ` · ${summary.destinationName}` : ""}
                  </p>
                  <span className="text-lg font-bold text-brand-blue-600">{summary.readinessScore}점</span>
                </div>
                <p className="mt-1 text-slate-500">
                  TOP 부족조건 · {summary.topGapName ?? "-"} · 현재 지원가능공고 {summary.currentEligibleJobCount}건 · 분석일{" "}
                  {summary.createdAt.slice(0, 10)}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
