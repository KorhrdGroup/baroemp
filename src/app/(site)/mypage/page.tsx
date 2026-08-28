import type { Metadata } from "next";
import { interactiveRowClass } from "@/lib/ui-classes";
import Link from "next/link";
import {
  Briefcase,
  ClipboardList,
  ExternalLink,
  FileText,
  Gift,
  Headset,
  Pencil,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { labelDesiredStartTiming, labelEmploymentStatus, labelRegion, labelWorkType } from "@/lib/labels";
import { getJobRepository, getSupportAssessmentSessionRepository, getSupportProgramRepository } from "@/lib/repositories";
import { activityEventLogger } from "@/lib/activity/event-logger";
import { getRecommendedJobsForUser, type JobWithMatch } from "@/services/job-search.service";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { getUserSupportBookmarkIdsAction } from "@/features/support/support-actions";
import { getUserCrmDetail } from "@/services/user-crm.service";
import { requireUser, isAdminRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/utils/phone";
import { SUPPORT_CATEGORY_LABELS } from "@/types";
import type { Job, SupportProgram } from "@/types";

interface MyPageJobData {
  bookmarked: Job[];
  recommended: JobWithMatch[];
  applyHistory: { job: Job; occurredAt: string }[];
  /** 요약 줄에 찍는 전체 건수. 카드에는 앞의 몇 건만 보여주므로 목록 길이와 다르다. */
  bookmarkCount: number;
  applyCount: number;
}

async function loadMyPageJobData(userId: string): Promise<MyPageJobData> {
  try {
    const [bookmarkIds, events, recommendedWithMatch] = await Promise.all([
      getUserJobBookmarkIdsAction(),
      activityEventLogger.getEventsByUser(userId),
      getRecommendedJobsForUser(userId, 4),
    ]);

    const jobRepo = getJobRepository();
    const applyEvents = events.filter((e) => e.eventType === "job_apply_clicked" && e.entityId).slice(0, 4);

    const [bookmarked, applyJobs] = await Promise.all([
      Promise.all(bookmarkIds.slice(0, 6).map((id) => jobRepo.findById(id))),
      Promise.all(applyEvents.map((e) => jobRepo.findById(e.entityId!))),
    ]);

    return {
      bookmarked: bookmarked.filter((j): j is Job => Boolean(j)),
      recommended: recommendedWithMatch,
      applyHistory: applyEvents
        .map((e, i) => ({ job: applyJobs[i], occurredAt: e.occurredAt }))
        .filter((x): x is { job: Job; occurredAt: string } => Boolean(x.job)),
      bookmarkCount: bookmarkIds.length,
      applyCount: events.filter((e) => e.eventType === "job_apply_clicked" && e.entityId).length,
    };
  } catch {
    return { bookmarked: [], recommended: [], applyHistory: [], bookmarkCount: 0, applyCount: 0 };
  }
}

interface MyPageSupportData {
  latestSessionId?: string;
  latestCompletedAt?: string;
  bookmarked: SupportProgram[];
  applyHistory: { program: SupportProgram; occurredAt: string }[];
  bookmarkCount: number;
  applyCount: number;
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
    const applyEvents = events.filter((e) => e.eventType === "support_apply_clicked" && e.entityId).slice(0, 4);

    const [bookmarked, applyPrograms] = await Promise.all([
      Promise.all(bookmarkIds.slice(0, 6).map((id) => supportRepo.findById(id))),
      Promise.all(applyEvents.map((e) => supportRepo.findById(e.entityId!))),
    ]);

    const latestSession = [...sessions].sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1))[0];

    return {
      latestSessionId: latestSession?.id,
      latestCompletedAt: latestSession?.completedAt,
      bookmarked: bookmarked.filter((p): p is SupportProgram => Boolean(p)),
      applyHistory: applyEvents
        .map((e, i) => ({ program: applyPrograms[i], occurredAt: e.occurredAt }))
        .filter((x): x is { program: SupportProgram; occurredAt: string } => Boolean(x.program)),
      bookmarkCount: bookmarkIds.length,
      applyCount: events.filter((e) => e.eventType === "support_apply_clicked" && e.entityId).length,
    };
  } catch {
    return { bookmarked: [], applyHistory: [], bookmarkCount: 0, applyCount: 0 };
  }
}

/** 오른쪽 아래에 세우는 다음에 갈 곳. 마이페이지에서 나가는 길을 한 곳에 모은다. */
const SHORTCUTS: { href: string; label: string; icon: typeof Search }[] = [
  { href: "/assessment", label: "직업진단", icon: Sparkles },
  { href: "/jobs", label: "일자리찾기", icon: Search },
  { href: "/support", label: "지원금찾기", icon: Gift },
  { href: "/resume", label: "이력서 첨삭", icon: FileText },
  { href: "/resume#experience-bank", label: "경험뱅크", icon: ClipboardList },
  { href: "/consulting", label: "취업컨설팅", icon: Headset },
];

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

  const { profile, careerProfile, lead, assessmentResults } = detail;
  const latestResult = assessmentResults[0];
  const [jobData, supportData] = await Promise.all([
    loadMyPageJobData(user.id),
    loadMyPageSupportData(user.id),
  ]);

  /*
    맨 위 요약 줄. 지금 내가 어디까지 해뒀는지를 숫자로 먼저 보여주고, 각 숫자는
    그 내용이 있는 자리로 데려간다. 찜·지원은 아래 카드가 있을 때만 그 카드로 내려가고,
    없으면 채우러 갈 화면으로 보낸다.
  */
  // 카드가 하나도 없으면 채용공고 묶음 자체를 그리지 않는다 (제목만 남는 빈 섹션 방지).
  const hasJobActivity =
    jobData.recommended.length > 0 ||
    jobData.bookmarked.length > 0 ||
    jobData.applyHistory.length > 0;

  const stats = [
    {
      key: "resume",
      label: "내 이력서",
      value: detail.resumeSummary.resumeCount,
      href: "/resume",
      icon: FileText,
      tone: "bg-brand-blue-50 text-brand-blue-600",
    },
    {
      key: "coverLetter",
      label: "자기소개서",
      value: detail.resumeSummary.coverLetterCount,
      href: "/resume",
      icon: Pencil,
      tone: "bg-violet-50 text-violet-500",
    },
    {
      key: "jobBookmark",
      label: "찜한 공고",
      value: jobData.bookmarkCount,
      href: jobData.bookmarked.length > 0 ? "#bookmarked-jobs" : "/jobs",
      icon: Star,
      tone: "bg-amber-50 text-amber-500",
    },
    {
      key: "supportBookmark",
      label: "찜한 지원금",
      value: supportData.bookmarkCount,
      href: supportData.bookmarked.length > 0 ? "#bookmarked-support" : "/support",
      icon: Gift,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      key: "apply",
      label: "지원한 곳",
      value: jobData.applyCount + supportData.applyCount,
      href: jobData.applyHistory.length > 0 ? "#apply-history" : "/jobs",
      icon: Send,
      tone: "bg-rose-50 text-rose-500",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* 제목을 "마이페이지"라고 적지 않는다. 메뉴에서 눌러 들어온 자리라 이미 알고 있다. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-title-2 font-bold text-slate-900 sm:text-headline-3">
            {profile.name ?? "회원"}님
          </h1>
          <Badge variant="outline" className="rounded-full text-label-1 text-slate-600">
            {labelEmploymentStatus(careerProfile?.employmentStatus)}
          </Badge>
          {detail.resumeSummary.primaryResume && (
            <Badge className="rounded-full border-0 bg-brand-blue-50 text-label-1 text-brand-blue-700">
              이력서 완성도 {detail.resumeSummary.primaryResume.completeness}%
            </Badge>
          )}
        </div>
        <Button variant="outline" asChild>
          <Link href="/mypage/profile">
            <Pencil className="size-4" />
            정보 수정
          </Link>
        </Button>
      </div>

      {/*
        요약 줄. 칸 사이는 테두리 대신 1px 틈으로 가른다 - 테두리를 칸마다 두면
        가운데 선이 두 겹으로 겹친다.
      */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-5">
        {stats.map((stat, idx) => (
          <Link
            key={stat.key}
            href={stat.href}
            className={cn(
              "flex items-center gap-3 bg-white px-4 py-5",
              // 좁은 화면은 2열이라 홀수 개면 마지막 칸 옆이 빈 채로 바탕색이 드러난다.
              idx === stats.length - 1 && stats.length % 2 === 1 && "col-span-2 sm:col-span-1",
              interactiveRowClass,
            )}
          >
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", stat.tone)}>
              <stat.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-label-1 text-slate-500">{stat.label}</span>
              <span className="block text-title-3 font-bold text-slate-900">{stat.value}</span>
            </span>
          </Link>
        ))}
      </div>

      {/*
        본문은 왼쪽에 쌓고, 내 정보처럼 늘 같은 자리에 있어야 하는 것은 오른쪽에 붙인다.
        전에는 모든 카드를 2열에 섞어 넣어, 데이터 유무로 카드가 나타났다 사라질 때마다
        옆자리가 비었다. 목록 카드는 이제 한 칸을 다 써서 공고 제목도 덜 잘린다.
      */}
      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-10">
        <section>
          <h2 className="mb-4 text-body-1 font-bold text-slate-900">취업 준비</h2>
          <div className="space-y-4">
            {/* C. 직업진단 */}
            {latestResult ? (
              <Card className="rounded-xl border-0 ring-1 ring-border">
                <CardHeader>
                  <CardTitle className="text-body-2">최근 직업진단 결과</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-3 text-label-1 text-slate-600">
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
                      <Link href="/assessment?start=1">다시 검사</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-xl border-0 ring-1 ring-border">
                <CardHeader>
                  <CardTitle className="text-body-2">직업진단</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-3 text-label-1 text-slate-600">
                  <p>아직 직업진단을 받지 않았어요. 몇 가지 질문으로 나에게 맞는 직업을 찾아드려요.</p>
                  <Button className="mt-auto w-full bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                    <Link href="/assessment?start=1">직업진단 시작</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/*
              취업 준비도. 이력서 전체 점검을 돌리면 쌓이는 값인데, 지금까지 관리자
              화면에서만 보였다. 회원 본인 데이터이고 "무엇이 부족한지"가 적혀 있어
              다음에 할 일로 바로 이어진다. 분석 이력이 없으면 카드를 세우지 않는다 -
              빈 카드를 두느니 없는 편이 낫다.
            */}
            {detail.careerGapSummaries.length > 0 && (
              <Card className="rounded-xl border-0 ring-1 ring-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-body-2">
                    <Target className="size-4" /> 취업 준비도
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-label-1 text-slate-600">
                  {detail.careerGapSummaries.map((summary) => (
                    <div key={summary.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-medium text-slate-700">
                          {summary.occupationName ?? "희망 직업"}
                          {summary.destinationName ? ` · ${summary.destinationName}` : ""}
                        </p>
                        <span className="shrink-0 font-bold text-brand-blue-600">{summary.readinessScore}점</span>
                      </div>
                      <Progress value={summary.readinessScore} className="mt-2 h-1.5" />
                      {/* 부족 항목 이름이 무엇이든 붙는 말이라 조사를 쓰지 않는다. */}
                      <p className="mt-2 text-label-2 text-slate-500">
                        {summary.topGapName ? `가장 부족한 것 · ${summary.topGapName} · ` : ""}
                        지금 지원할 수 있는 공고 {summary.currentEligibleJobCount}건
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* D-2. 이력서/자기소개서 (스펙 51번) */}
            <Card className="rounded-xl border-0 ring-1 ring-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-body-2">
                  <FileText className="size-4" /> 이력서 · 자기소개서
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-3 text-label-1 text-slate-600">
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
                    <Link href="/cover-letter/new">자기소개서 작성</Link>
                  </Button>
                  {/* 경험뱅크는 이력서·자소서 양쪽의 재료다. 기존 진입점이 /resume과 자소서 편집기뿐이었다. */}
                  <Button variant="outline" asChild>
                    <Link href="/resume#experience-bank">경험뱅크 관리</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {hasJobActivity && (
          <section>
            <h2 className="mb-4 text-body-1 font-bold text-slate-900">채용공고</h2>
            <div className="space-y-4">
              {/* D. 채용공고 */}
              {jobData.recommended.length > 0 && (
                <Card className="rounded-xl border-0 ring-1 ring-border">
                  <CardHeader>
                    <CardTitle className="text-body-2">맞춤 채용공고</CardTitle>
                  </CardHeader>
                  {/* 카드가 반 칸이 되어 2열로 나누면 공고 제목이 심하게 잘린다. 다른 목록 카드와 같이 한 열로 둔다. */}
                  <CardContent className="space-y-1.5 text-label-1 text-slate-600">
                    {jobData.recommended.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className={cn("flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2", interactiveRowClass)}
                      >
                        <span className="truncate font-medium text-slate-700">{job.title}</span>
                        {job.match && <span className="shrink-0 font-bold text-brand-blue-600">{job.match.score}점</span>}
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {jobData.bookmarked.length > 0 && (
                <Card id="bookmarked-jobs" className="scroll-mt-24 rounded-xl border-0 ring-1 ring-border">
                  <CardHeader>
                    <CardTitle className="text-body-2">찜한 채용공고</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-label-1 text-slate-600">
                    {jobData.bookmarked.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className={cn("flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2", interactiveRowClass)}
                      >
                        <span className="truncate font-medium text-slate-700">{job.title}</span>
                        <span className="shrink-0 text-slate-400">{job.companyName}</span>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {jobData.applyHistory.length > 0 && (
                <Card id="apply-history" className="scroll-mt-24 rounded-xl border-0 ring-1 ring-border">
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
                        className={cn("flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2", interactiveRowClass)}
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
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-body-1 font-bold text-slate-900">지원제도</h2>
          <div className="space-y-4">
            {/* E. 지원제도 */}
            {supportData.latestSessionId ? (
              <Card className="rounded-xl border-0 ring-1 ring-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-body-2">
                    <Gift className="size-4" /> 지원금 진단 결과
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-3 text-label-1 text-slate-600">
                  {supportData.latestCompletedAt && (
                    <p className="text-slate-400">검사일 · {supportData.latestCompletedAt.slice(0, 10)}</p>
                  )}
                  <Button variant="outline" className="mt-auto w-full" asChild>
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
                <CardContent className="flex flex-1 flex-col space-y-3 text-label-1 text-slate-600">
                  <p>아직 지원금 진단을 받지 않았어요. 몇 가지 조건만 입력하면 받을 수 있는 혜택을 찾아드려요.</p>
                  <Button className="mt-auto w-full bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                    <Link href="/support?start=1">지원금 찾기 시작하기</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {supportData.bookmarked.length > 0 && (
              <Card id="bookmarked-support" className="scroll-mt-24 rounded-xl border-0 ring-1 ring-border">
                <CardHeader>
                  <CardTitle className="text-body-2">찜한 지원제도</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-label-1 text-slate-600">
                  {supportData.bookmarked.map((program) => (
                    <Link
                      key={program.id}
                      href={`/support/${program.id}`}
                      className={cn("flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2", interactiveRowClass)}
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

            {supportData.applyHistory.length > 0 && (
              <Card className="rounded-xl border-0 ring-1 ring-border">
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
                      className={cn("flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2", interactiveRowClass)}
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
          </div>
        </section>
        </div>

        {/*
          늘 같은 자리에 있어야 하는 것들. 내 정보는 확인하러 오는 값이라 본문 흐름에
          섞이면 매번 찾아야 하고, 바로가기는 여기서 다음에 갈 곳을 고르는 자리다.
        */}
        <aside className="w-full space-y-4 lg:w-80 lg:shrink-0">
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
                {/* Lead 등급·점수는 영업용 내부 지표다. 본인 화면이라도 일반 회원에게는 노출하지 않는다. */}
                {lead && isAdminRole(user.role) && (
                  <p className="pt-1">
                    <span className="text-slate-400">Lead</span> ·{" "}
                    <Badge className="rounded-md border-0 bg-brand-blue-50 text-label-2 text-brand-blue-700">
                      {lead.score.grade}등급 {lead.score.totalScore}점
                    </Badge>
                  </p>
                )}
              </CardContent>
            </Card>

          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-body-2">바로가기</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {SHORTCUTS.map((shortcut) => (
                <Link
                  key={shortcut.href}
                  href={shortcut.href}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl px-2 py-4 text-center text-label-1 text-slate-600",
                    interactiveRowClass,
                  )}
                >
                  <shortcut.icon className="size-5 text-brand-blue-600" />
                  {shortcut.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
