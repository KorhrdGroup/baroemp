import type { Metadata } from "next";
import Link from "next/link";
import {
  Briefcase,
  ClipboardList,
  ExternalLink,
  FileText,
  Gift,
  GraduationCap,
  MessageCircle,
  Pencil,
  Target,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { labelDesiredStartTiming, labelEmploymentStatus, labelRegion, labelWorkType } from "@/lib/labels";
import { getJobRepository, getSupportAssessmentSessionRepository, getSupportProgramRepository } from "@/lib/repositories";
import { activityEventLogger } from "@/lib/activity/event-logger";
import { getRecommendedJobsForUser, type JobWithMatch } from "@/services/job-search.service";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { getUserSupportBookmarkIdsAction } from "@/features/support/support-actions";
import { getUserCrmDetail } from "@/services/user-crm.service";
import { requireUser } from "@/lib/auth/session";
import { formatPhone } from "@/lib/utils/phone";
import { SUPPORT_CATEGORY_LABELS } from "@/types";
import type { Job, SupportProgram } from "@/types";

interface MyPageJobData {
  bookmarked: Job[];
  recentlyViewed: Job[];
  recommended: JobWithMatch[];
  applyHistory: { job: Job; occurredAt: string }[];
}

async function loadMyPageJobData(userId: string): Promise<MyPageJobData> {
  try {
    const [bookmarkIds, events, recommendedWithMatch] = await Promise.all([
      getUserJobBookmarkIdsAction(),
      activityEventLogger.getEventsByUser(userId),
      getRecommendedJobsForUser(userId, 4),
    ]);

    const jobRepo = getJobRepository();
    const viewedIds = [
      ...new Set(
        events
          .filter((e) => e.eventType === "job_detail_viewed" && e.entityId)
          .map((e) => e.entityId!),
      ),
    ].slice(0, 4);
    const applyEvents = events.filter((e) => e.eventType === "job_apply_clicked" && e.entityId).slice(0, 4);

    const [bookmarked, recentlyViewed, applyJobs] = await Promise.all([
      Promise.all(bookmarkIds.slice(0, 6).map((id) => jobRepo.findById(id))),
      Promise.all(viewedIds.map((id) => jobRepo.findById(id))),
      Promise.all(applyEvents.map((e) => jobRepo.findById(e.entityId!))),
    ]);

    return {
      bookmarked: bookmarked.filter((j): j is Job => Boolean(j)),
      recentlyViewed: recentlyViewed.filter((j): j is Job => Boolean(j)),
      recommended: recommendedWithMatch,
      applyHistory: applyEvents
        .map((e, i) => ({ job: applyJobs[i], occurredAt: e.occurredAt }))
        .filter((x): x is { job: Job; occurredAt: string } => Boolean(x.job)),
    };
  } catch {
    return { bookmarked: [], recentlyViewed: [], recommended: [], applyHistory: [] };
  }
}

interface MyPageSupportData {
  latestSessionId?: string;
  latestCompletedAt?: string;
  bookmarked: SupportProgram[];
  recentlyViewed: SupportProgram[];
  applyHistory: { program: SupportProgram; occurredAt: string }[];
}

/** loadMyPageJobData와 동일한 철학으로 지원제도(STEP 5) 이력을 모은다. */
async function loadMyPageSupportData(userId: string): Promise<MyPageSupportData> {
  try {
    const [bookmarkIds, events, sessions] = await Promise.all([
      getUserSupportBookmarkIdsAction(),
      activityEventLogger.getEventsByUser(userId),
      getSupportAssessmentSessionRepository().findAll({ userId, status: "completed" }),
    ]);

    const supportRepo = getSupportProgramRepository();
    const viewedIds = [
      ...new Set(
        events.filter((e) => e.eventType === "support_viewed" && e.entityId).map((e) => e.entityId!),
      ),
    ].slice(0, 4);
    const applyEvents = events.filter((e) => e.eventType === "support_apply_clicked" && e.entityId).slice(0, 4);

    const [bookmarked, recentlyViewed, applyPrograms] = await Promise.all([
      Promise.all(bookmarkIds.slice(0, 6).map((id) => supportRepo.findById(id))),
      Promise.all(viewedIds.map((id) => supportRepo.findById(id))),
      Promise.all(applyEvents.map((e) => supportRepo.findById(e.entityId!))),
    ]);

    const latestSession = [...sessions].sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1))[0];

    return {
      latestSessionId: latestSession?.id,
      latestCompletedAt: latestSession?.completedAt,
      bookmarked: bookmarked.filter((p): p is SupportProgram => Boolean(p)),
      recentlyViewed: recentlyViewed.filter((p): p is SupportProgram => Boolean(p)),
      applyHistory: applyEvents
        .map((e, i) => ({ program: applyPrograms[i], occurredAt: e.occurredAt }))
        .filter((x): x is { program: SupportProgram; occurredAt: string } => Boolean(x.program)),
    };
  } catch {
    return { bookmarked: [], recentlyViewed: [], applyHistory: [] };
  }
}

export const metadata: Metadata = {
  title: "마이페이지 | 한평생 바로취업",
};

/**
 * 실회원 마이페이지 (스펙 22번). mock userId(user-1001) 의존을 완전히 제거하고
 * 현재 로그인한 auth user(requireUser)의 실제 데이터만 조회한다.
 * 데이터 원천: getUserCrmDetail() - 관리자 CRM 상세와 동일한 서비스를 재사용해
 * "회원이 보는 자기 데이터"와 "관리자가 보는 회원 데이터"가 항상 일치하도록 한다.
 */
export default async function MyPage() {
  const user = await requireUser("/mypage");
  // 프로필 행이 아직 없어도(가입 직후, Mock 로그인 등) 인증 정보로 최소 프로필을 만들어 화면을 연다.
  const detail = await getUserCrmDetail(user.id, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  if (!detail) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState icon={UserRound} title="프로필을 불러올 수 없습니다" description="잠시 후 다시 시도해주세요." />
      </div>
    );
  }

  const { profile, careerProfile, lead, assessmentResults, consultations, recommendedContents } = detail;
  const latestResult = assessmentResults[0];
  const [jobData, supportData] = await Promise.all([
    loadMyPageJobData(user.id),
    loadMyPageSupportData(user.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-title-2 font-bold text-slate-900 sm:text-headline-3">마이페이지</h1>
          <p className="mt-2 text-body-2-reading text-slate-500">
            {profile.name ?? "회원"}님의 Career Profile과 활동 이력을 확인할 수 있는 공간입니다.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/mypage/profile">
            <Pencil className="size-4" />
            정보 수정
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* A. 내 정보 */}
        <Card className="rounded-xl border-0 ring-1 ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-body-2">
              <UserRound className="size-4" /> 내 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-label-1 text-slate-600">
            <p>
              <span className="text-slate-400">이름</span> · {profile.name ?? "-"}
            </p>
            <p>
              <span className="text-slate-400">이메일</span> · {profile.email ?? "-"}
            </p>
            <p>
              <span className="text-slate-400">휴대전화번호</span> · {formatPhone(profile.phone)}
            </p>
            <p>
              <span className="text-slate-400">가입일</span> · {profile.createdAt.slice(0, 10)}
            </p>
          </CardContent>
        </Card>

        {/* B. 취업 프로필 */}
        <Card className="rounded-xl border-0 ring-1 ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-body-2">
              <Briefcase className="size-4" /> 취업 프로필
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-label-1 text-slate-600">
            <p>
              <span className="text-slate-400">취업상태</span> · {labelEmploymentStatus(careerProfile?.employmentStatus)}
            </p>
            <p>
              <span className="text-slate-400">희망지역</span> · {labelRegion(careerProfile?.region)}
            </p>
            <p>
              <span className="text-slate-400">희망근무형태</span> ·{" "}
              {careerProfile?.desiredWorkTypes && careerProfile.desiredWorkTypes.length > 0
                ? careerProfile.desiredWorkTypes.map((t) => labelWorkType(t)).join(", ")
                : "-"}
            </p>
            <p>
              <span className="text-slate-400">희망급여</span> ·{" "}
              {careerProfile?.desiredSalaryMin || careerProfile?.desiredSalaryMax
                ? `${careerProfile?.desiredSalaryMin ?? "-"} ~ ${careerProfile?.desiredSalaryMax ?? "-"}만원`
                : "-"}
            </p>
            <p>
              <span className="text-slate-400">희망 취업시기</span> · {labelDesiredStartTiming(careerProfile?.desiredStartTiming)}
            </p>
            <p>
              <span className="text-slate-400">교육의향</span> · {careerProfile?.isOpenToTraining ? "있음" : "-"}
            </p>
            {lead && (
              <p className="pt-1">
                <span className="text-slate-400">Lead</span> ·{" "}
                <Badge className="rounded-md border-0 bg-brand-blue-50 text-label-2 text-brand-blue-700">
                  {lead.score.grade}등급 {lead.score.totalScore}점
                </Badge>
              </p>
            )}
          </CardContent>
        </Card>

        {/* C. 직업진단 */}
        {latestResult ? (
          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-body-2">최근 직업진단 결과</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-label-1 text-slate-600">
              <p className="text-slate-400">검사일 · {latestResult.completedAt.slice(0, 10)}</p>
              <div className="space-y-1.5">
                {latestResult.recommendations.slice(0, 3).map((rec, i) => (
                  <div key={rec.occupationId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="font-medium text-slate-700">
                      TOP{i + 1} · {rec.occupationName}
                    </span>
                    <span className="font-bold text-brand-blue-600">{rec.totalScore}점</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/assessment/result/${latestResult.sessionId}`}>
                    <ClipboardList className="size-4" />
                    결과 다시보기
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <Link href="/assessment">다시 검사</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-body-2">직업진단</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-label-1 text-slate-600">
              <p>아직 직업진단을 받지 않았어요. 몇 가지 질문으로 나에게 맞는 직업을 찾아드려요.</p>
              <Button className="w-full bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                <Link href="/assessment">무료 직업진단 시작</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* D. 채용공고 */}
        {jobData.recommended.length > 0 && (
          <Card className="rounded-xl border-0 ring-1 ring-border md:col-span-2">
            <CardHeader>
              <CardTitle className="text-body-2">맞춤 채용공고</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-label-1 text-slate-600 sm:grid-cols-2">
              {jobData.recommended.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-brand-blue-50"
                >
                  <span className="truncate font-medium text-slate-700">{job.title}</span>
                  {job.match && <span className="shrink-0 font-bold text-brand-blue-600">{job.match.score}점</span>}
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {jobData.bookmarked.length > 0 && (
          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-body-2">찜한 채용공고</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-label-1 text-slate-600">
              {jobData.bookmarked.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-brand-blue-50"
                >
                  <span className="truncate font-medium text-slate-700">{job.title}</span>
                  <span className="shrink-0 text-slate-400">{job.companyName}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {jobData.recentlyViewed.length > 0 && (
          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-body-2">최근 본 채용공고</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-label-1 text-slate-600">
              {jobData.recentlyViewed.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-brand-blue-50"
                >
                  <span className="truncate font-medium text-slate-700">{job.title}</span>
                  <span className="shrink-0 text-slate-400">{job.companyName}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {jobData.applyHistory.length > 0 && (
          <Card className="rounded-xl border-0 ring-1 ring-border md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-body-2">
                <Briefcase className="size-4" /> 지원 페이지로 이동한 공고
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-label-1 text-slate-600">
              <p className="text-label-2 text-slate-400">
                아래 공고는 지원 페이지로 이동한 이력입니다. 실제 지원 완료 여부는 각 사이트에서 확인해주세요.
              </p>
              {jobData.applyHistory.map(({ job, occurredAt }) => (
                <Link
                  key={`${job.id}-${occurredAt}`}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-brand-blue-50"
                >
                  <span className="flex items-center gap-1.5 truncate font-medium text-slate-700">
                    <ExternalLink className="size-3.5 shrink-0" />
                    {job.title}
                  </span>
                  <span className="shrink-0 text-slate-400">{occurredAt.slice(0, 10)}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* D-2. 이력서/자기소개서 (스펙 51번) */}
        <Card className="rounded-xl border-0 ring-1 ring-border md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-body-2">
              <FileText className="size-4" /> 이력서 · 자기소개서
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-label-1 text-slate-600">
            {detail.resumeSummary.primaryResume ? (
              <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="font-medium text-slate-700">{detail.resumeSummary.primaryResume.title}</p>
                <p className="mt-1 text-label-1 text-slate-400">
                  완성도 {detail.resumeSummary.primaryResume.completeness}% · 최근수정{" "}
                  {detail.resumeSummary.primaryResume.updatedAt.slice(0, 10)}
                </p>
              </div>
            ) : (
              <p>아직 작성한 이력서가 없어요. 보유하신 정보를 불러와 빠르게 작성해보세요.</p>
            )}
            {detail.resumeSummary.coverLetterCount > 0 && (
              <p className="text-label-1 text-slate-400">
                자기소개서 {detail.resumeSummary.coverLetterCount}건 · 최근작성{" "}
                {detail.resumeSummary.lastCoverLetterUpdatedAt?.slice(0, 10) ?? "-"}
              </p>
            )}
            {/* 버튼이 3개라 좁은 화면에서는 세로로 쌓는다. */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant="outline" asChild>
                <Link href="/resume">
                  <Pencil className="size-4" />내 이력서 관리
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/cover-letter">자기소개서 작성</Link>
              </Button>
              {/* 경험뱅크는 이력서·자소서 양쪽의 재료다. 기존 진입점이 /resume과 자소서 편집기뿐이었다. */}
              <Button variant="outline" asChild>
                <Link href="/experience-bank">경험뱅크 관리</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* D-3. 취업 준비도 (스펙 37번) */}
        <Card className="rounded-xl border-0 ring-1 ring-border md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-body-2">
              <Target className="size-4" /> 취업 준비도
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-label-1 text-slate-600">
            {detail.careerGapSummaries.length === 0 ? (
              <>
                <p>아직 취업 준비도를 확인하지 않았어요. 실제 채용공고 기준으로 지금 준비 상태를 확인해보세요.</p>
                <Button className="w-full bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                  <Link href="/career-gap">취업 준비도 확인하기</Link>
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                {detail.careerGapSummaries.map((summary) => (
                  <div key={summary.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-700">
                        {summary.occupationName ?? "직업 미지정"}
                        {summary.destinationName ? ` · ${summary.destinationName}` : ""}
                      </p>
                      <span className="font-bold text-brand-blue-600">{summary.readinessScore}점</span>
                    </div>
                    <p className="mt-1 text-label-1 text-slate-400">
                      {summary.topGapName ? `TOP 보완항목 · ${summary.topGapName}` : "부족 조건 없음"} · 최근분석{" "}
                      {summary.createdAt.slice(0, 10)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/career-gap/${summary.id}`}>결과 다시보기</Link>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href="/career-gap">다시 분석</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* E. 지원제도 */}
        {supportData.latestSessionId ? (
          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-body-2">
                <Gift className="size-4" /> 지원금 진단 결과
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-label-1 text-slate-600">
              {supportData.latestCompletedAt && (
                <p className="text-slate-400">검사일 · {supportData.latestCompletedAt.slice(0, 10)}</p>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/support/result/${supportData.latestSessionId}`}>
                  <Gift className="size-4" />
                  지원금 결과 다시보기
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-body-2">
                <Gift className="size-4" /> 지원금 찾기
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-label-1 text-slate-600">
              <p>아직 지원금 진단을 받지 않았어요. 몇 가지 조건만 입력하면 받을 수 있는 혜택을 찾아드려요.</p>
              <Button className="w-full bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                <Link href="/support">지원금 찾기 시작하기</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {supportData.bookmarked.length > 0 && (
          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-body-2">찜한 지원제도</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-label-1 text-slate-600">
              {supportData.bookmarked.map((program) => (
                <Link
                  key={program.id}
                  href={`/support/${program.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-brand-blue-50"
                >
                  <span className="truncate font-medium text-slate-700">{program.title}</span>
                  <Badge variant="outline" className="shrink-0 rounded-full text-label-2 text-slate-500">
                    {SUPPORT_CATEGORY_LABELS[program.category] ?? program.category}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {supportData.recentlyViewed.length > 0 && (
          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-body-2">최근 본 지원제도</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-label-1 text-slate-600">
              {supportData.recentlyViewed.map((program) => (
                <Link
                  key={program.id}
                  href={`/support/${program.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-brand-blue-50"
                >
                  <span className="truncate font-medium text-slate-700">{program.title}</span>
                  <span className="shrink-0 text-slate-400">
                    {program.organizationName ?? program.organization}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {supportData.applyHistory.length > 0 && (
          <Card className="rounded-xl border-0 ring-1 ring-border md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-body-2">
                <Gift className="size-4" /> 신청 페이지로 이동한 지원제도
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-label-1 text-slate-600">
              <p className="text-label-2 text-slate-400">
                아래 제도는 신청 페이지로 이동한 이력입니다. 실제 신청 완료 여부는 운영기관에서 확인해주세요.
              </p>
              {supportData.applyHistory.map(({ program, occurredAt }) => (
                <Link
                  key={`${program.id}-${occurredAt}`}
                  href={`/support/${program.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-brand-blue-50"
                >
                  <span className="flex items-center gap-1.5 truncate font-medium text-slate-700">
                    <ExternalLink className="size-3.5 shrink-0" />
                    {program.title}
                  </span>
                  <span className="shrink-0 text-slate-400">{occurredAt.slice(0, 10)}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* F. 추천 교육/콘텐츠 */}
        {recommendedContents.length > 0 && (
          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-body-2">
                <GraduationCap className="size-4" /> 추천 교육·콘텐츠
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-label-1 text-slate-600">
              {recommendedContents.slice(0, 5).map((content) => (
                <div key={content.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="truncate font-medium text-slate-700">{content.title}</span>
                  <span className="shrink-0 font-bold text-brand-blue-600">{content.score}점</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* G. 상담 */}
        <Card className="rounded-xl border-0 ring-1 ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-body-2">
              <MessageCircle className="size-4" /> 상담
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-label-1 text-slate-600">
            {consultations.length > 0 ? (
              consultations.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-medium text-slate-700">{c.requestedTopic ?? "상담"}</span>
                  <Badge variant="outline" className="rounded-md text-label-2">
                    {c.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-slate-400">아직 신청한 상담이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
