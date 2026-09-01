import type { Metadata } from "next";
import { interactiveRowClass } from "@/lib/ui-classes";
import Link from "next/link";
import {
  Briefcase,
  ExternalLink,
  FileText,
  Gift,
  Pencil,
  Star,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { labelDesiredStartTiming, labelEmploymentStatus, labelOrganization, labelRegion, labelWorkType } from "@/lib/labels";
import { formatSalary } from "@/lib/salary";
import {
  getJobRepository,
  getMatchResultRepository,
  getSupportAssessmentSessionRepository,
  getSupportProgramRepository,
} from "@/lib/repositories";
import { activityEventLogger } from "@/lib/activity/event-logger";
import { getRecommendedJobsForUser, type JobWithMatch } from "@/services/job-search.service";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { getUserSupportBookmarkIdsAction } from "@/features/support/support-actions";
import { getUserCrmDetail } from "@/services/user-crm.service";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/utils/phone";
import { SUPPORT_CATEGORY_LABELS, SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";
import type { Job, MatchResult, SupportEligibilityGrade, SupportProgram } from "@/types";

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
  /** 진단이 "받을 만하다"고 꼽아준 제도 상위 몇 건. 결과 화면과 같은 값(match_results)을 읽는다. */
  topMatches: { program: SupportProgram; grade?: MatchResult["grade"] }[];
}

/** loadMyPageJobData와 동일한 철학으로 지원제도(STEP 5) 이력을 모은다. */
async function loadMyPageSupportData(userId: string): Promise<MyPageSupportData> {
  try {
    const [bookmarkIds, events, sessions, matches] = await Promise.all([
      getUserSupportBookmarkIdsAction(),
      activityEventLogger.getEventsByUser(userId),
      getSupportAssessmentSessionRepository().findAll({ userId, status: "completed" }),
      getMatchResultRepository().findAll({ sourceId: userId, targetType: "support_program" }),
    ]);

    const supportRepo = getSupportProgramRepository();
    const applyEvents = events.filter((e) => e.eventType === "support_apply_clicked" && e.entityId).slice(0, 4);

    const topMatchRows = [...matches].sort((a, b) => b.score - a.score).slice(0, 3);

    const [bookmarked, applyPrograms, topPrograms] = await Promise.all([
      Promise.all(bookmarkIds.slice(0, 6).map((id) => supportRepo.findById(id))),
      Promise.all(applyEvents.map((e) => supportRepo.findById(e.entityId!))),
      Promise.all(topMatchRows.map((m) => supportRepo.findById(m.targetId))),
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
      topMatches: topMatchRows.flatMap((m, i) => {
        const program = topPrograms[i];
        return program ? [{ program, grade: m.grade }] : [];
      }),
    };
  } catch {
    return { bookmarked: [], applyHistory: [], bookmarkCount: 0, applyCount: 0, topMatches: [] };
  }
}

/*
  "바로가기"는 두지 않는다. 직업진단·일자리찾기·지원금찾기·이력서 첨삭·취업컨설팅은
  모두 상단 메뉴에 이미 있고, 경험뱅크도 이력서 화면에서 간다. 같은 길을 두 번 내면
  어느 쪽이 진짜인지 헷갈리고, 메뉴가 바뀔 때 여기도 같이 고쳐야 한다.
*/

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
      <div className="mx-auto max-w-6xl px-4.5 pt-10 pb-20 lg:px-8">
        <EmptyState icon={UserRound} title="프로필을 불러올 수 없습니다" description="잠시 후 다시 시도해주세요." />
      </div>
    );
  }

  /*
    lead(영업용 등급·점수)는 꺼내지 않는다. 회원에게 보여줄 값이 아니고, 관리자도
    여기가 아니라 관리자 회원상세에서 본다 - 회원용 화면이 보는 사람에 따라 다른 것을
    보여주면, 이 화면을 그대로 믿고 고칠 수 없다.
  */
  const { profile, careerProfile, assessmentResults } = detail;
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
      /* 이력서와 자기소개서가 한 페이지에 있어, 자기소개서 묶음 자리로 내려 보낸다. */
      href: "/resume#cover-letters",
      icon: Pencil,
      tone: "bg-violet-50 text-violet-500",
    },
    {
      key: "jobBookmark",
      label: "찜한 일자리",
      value: jobData.bookmarkCount,
      href: "/mypage/bookmarks#jobs",
      icon: Star,
      tone: "bg-amber-50 text-amber-500",
    },
    {
      key: "supportBookmark",
      label: "찜한 지원금",
      value: supportData.bookmarkCount,
      href: "/mypage/bookmarks#support",
      icon: Gift,
      tone: "bg-emerald-50 text-emerald-600",
    },
  ];
  /*
    "지원한 곳"은 세지 않는다. 이 사이트에서 지원까지 하는 것이 아니라 지원 페이지로
    보내주기만 하므로, 숫자로 세면 여기서 지원한 것처럼 읽힌다. 아래 이력 카드는
    "지원 페이지로 이동한" 이라고 밝혀 적으므로 그대로 둔다.
  */

  return (
    <div className="mx-auto max-w-6xl px-4.5 pt-10 pb-20 lg:px-8">
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
      </div>

      {/* 요약. 아래 카드들과 같은 모양의 카드 넉 장으로 세운다. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.key}
            href={stat.href}
            className={cn(
              "flex items-center gap-3 rounded-xl bg-white px-4 py-5 ring-1 ring-border",
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
        {/*
          내 정보는 확인하러 오는 값이라 본문 흐름에 섞이면 매번 찾아야 한다.
          넓은 화면에서는 왼쪽에, 좁은 화면에서는 맨 위에 둬 늘 같은 자리에서 찾게 한다.

          본문과 마찬가지로 제목을 얹는다. 한쪽만 제목이 있으면 그만큼 아래로 밀려
          두 칸의 첫 상자가 어긋난 채로 시작한다.
          긴 본문을 내려도 따라오도록 화면에 붙여 둔다.
        */}
        <aside className="w-full lg:sticky lg:top-24 lg:w-72 lg:shrink-0">
          {/* 고칠 값 바로 옆에 고치는 버튼을 둔다. 머리글에 있을 때는 무엇을 고치는 건지 멀었다. */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-body-1 font-bold text-slate-900">내 정보</h2>
            {/*
              버튼 높이(h-10)가 제목 줄을 늘려, 옆 칸보다 첫 카드가 18px 내려앉았다.
              세로 여백을 음수 마진으로 되돌려 줄 높이는 제목 글자 그대로 두고,
              누르는 자리만 넉넉하게 남긴다. 오른쪽 여백은 지워 글자를 카드 끝에 맞춘다.
            */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="-my-2 h-auto py-2 pr-0 text-slate-500 hover:bg-transparent hover:text-slate-700"
            >
              <Link href="/mypage/profile">정보 수정</Link>
            </Button>
          </div>
          {/* 기본 정보와 취업 프로필은 모두 "나"에 대한 내용이라 한 카드에 담고 구분선으로만 가른다. */}
          <Card className="rounded-xl border-0 ring-1 ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-body-2">
                <UserRound className="size-4" /> 기본 정보
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

            <div className="border-t border-slate-100" />

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
            </CardContent>
          </Card>
        </aside>

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
                  <div className="space-y-2.5">
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
                      <Link href={`/assessment/result/${latestResult.sessionId}`}>결과 다시보기</Link>
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
                  <Button className="mt-auto w-full" asChild>
                    <Link href="/assessment?start=1">직업진단 시작</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* D-2. 이력서/자기소개서 (스펙 51번) */}
            <Card className="rounded-xl border-0 ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-1.5 text-body-2">
                  <FileText className="size-4" /> 이력서 · 자기소개서
                </CardTitle>
                {/* 찜한 일자리·지원제도 카드와 같은 자리, 같은 모양. 카드에는 대표 이력서 한 건만 담긴다. */}
                <Link href="/resume" className="shrink-0 text-label-1 font-medium text-slate-500">
                  전체보기 →
                </Link>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-3 text-label-1 text-slate-600">
                {/*
                  이력서·자기소개서를 각각 가장 최근에 손 본 것 한 건씩. 개수는 위 통계 카드에
                  이미 있으므로, 여기서는 "이어서 할 것"을 보여주고 누르면 그 자리로 간다.
                */}
                {detail.resumeSummary.recentResume ? (
                  <Link
                    href={`/resume/${detail.resumeSummary.recentResume.id}/edit`}
                    className={cn("block rounded-lg bg-slate-50 px-3 py-2.5", interactiveRowClass)}
                  >
                    <p className="font-medium text-slate-700">
                      {detail.resumeSummary.recentResume.title || "제목 없는 이력서"}
                    </p>
                    <p className="mt-1 text-label-1 text-slate-400">
                      이력서 · 완성도 {detail.resumeSummary.recentResume.completeness}% · 최근수정{" "}
                      {detail.resumeSummary.recentResume.updatedAt.slice(0, 10)}
                    </p>
                  </Link>
                ) : (
                  <p>아직 작성한 이력서가 없어요. 보유하신 정보를 불러와 빠르게 작성해보세요.</p>
                )}
                {detail.resumeSummary.recentCoverLetter && (
                  <Link
                    href={`/cover-letter/${detail.resumeSummary.recentCoverLetter.id}/edit`}
                    className={cn("block rounded-lg bg-slate-50 px-3 py-2.5", interactiveRowClass)}
                  >
                    <p className="font-medium text-slate-700">
                      {detail.resumeSummary.recentCoverLetter.title || "제목 없는 자기소개서"}
                    </p>
                    <p className="mt-1 text-label-1 text-slate-400">
                      자기소개서 · 최근수정 {detail.resumeSummary.recentCoverLetter.updatedAt.slice(0, 10)}
                    </p>
                  </Link>
                )}
                {/* 버튼이 3개라 좁은 화면에서는 세로로 쌓는다. */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {/*
                    "내 이력서 관리"였는데 위 전체보기와 같은 /resume 으로 가서, 한 카드 안에
                    같은 곳으로 가는 길이 둘이 됐다. 여기서는 새로 만드는 쪽을 맡는다 -
                    옆의 "자기소개서 작성"과도 짝이 맞는다.
                  */}
                  <Button variant="outline" asChild>
                    <Link href="/resume/new">이력서 만들기</Link>
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

        <section>
            <h2 className="mb-4 text-body-1 font-bold text-slate-900">일자리</h2>
            <div className="space-y-4">
              {/* D. 채용공고 */}
              {jobData.recommended.length > 0 && (
                <Card className="rounded-xl border-0 ring-1 ring-border">
                  <CardHeader>
                    <CardTitle className="text-body-2">맞춤 일자리</CardTitle>
                  </CardHeader>
                  {/* 카드가 반 칸이 되어 2열로 나누면 공고 제목이 심하게 잘린다. 다른 목록 카드와 같이 한 열로 둔다. */}
                  <CardContent className="space-y-2.5 text-label-1 text-slate-600">
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

              {/*
                찜한 것이 없다고 카드를 통째로 감추면, 맨 위 요약에서 "찜한 공고 0"을 보고
                내려온 사람이 그 자리에서 아무것도 못 찾는다. 없으면 없다고 적어준다.
              */}
              <Card id="bookmarked-jobs" className="scroll-mt-24 rounded-xl border-0 ring-1 ring-border">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-body-2">찜한 일자리</CardTitle>
                  {/*
                    카드에는 앞의 몇 건만 담긴다. 넘칠 때만 길을 열면 그 전에는 전체 목록이
                    있다는 것조차 모른다. 하나라도 있으면 항상 둔다.
                  */}
                  {jobData.bookmarkCount > 0 && (
                    <Link
                      href="/mypage/bookmarks#jobs"
                      className="shrink-0 text-label-1 font-medium text-slate-500"
                    >
                      전체보기 →
                    </Link>
                  )}
                </CardHeader>
                <CardContent className="space-y-2.5 text-label-1 text-slate-600">
                  {jobData.bookmarked.length === 0 ? (
                    <p className="text-slate-400">
                      아직 찜한 일자리가 없어요.{" "}
                      <Link href="/jobs" className="font-semibold text-brand-blue-600 hover:underline">
                        일자리 찾아보기 →
                      </Link>
                    </p>
                  ) : (
                    jobData.bookmarked.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className={cn("block rounded-lg bg-slate-50 px-3 py-2.5", interactiveRowClass)}
                      >
                        {/* break-keep 이 없으면 한글이 음절 단위로 잘려 "모집합니 / 다." 처럼 끊긴다. */}
                        <p className="line-clamp-2 break-keep font-medium text-slate-800">{job.title}</p>
                        <p className="mt-1 truncate text-label-1 text-slate-500">
                          {[job.companyName, job.regionSigungu ?? labelRegion(job.region)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-label-1">
                          <span className="font-semibold text-brand-blue-600">{formatSalary(job)}</span>
                          {job.applyDeadline && (
                            <span className="text-slate-400">마감 {job.applyDeadline.slice(5, 10).replace("-", ".")}</span>
                          )}
                        </p>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>

              {jobData.applyHistory.length > 0 && (
                <Card id="apply-history" className="scroll-mt-24 rounded-xl border-0 ring-1 ring-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5 text-body-2">
                      <Briefcase className="size-4" /> 지원 페이지로 이동한 일자리
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-label-1 text-slate-600">
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
                  {/* 검사일과 버튼만 있으면 무엇이 나왔는지 다시 들어가 봐야 안다. 직업진단처럼 상위 몇 건을 적는다. */}
                  {supportData.topMatches.length > 0 && (
                    <div className="space-y-2.5">
                      {supportData.topMatches.map(({ program, grade }) => (
                        <div
                          key={program.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <span className="truncate font-medium text-slate-700">{program.title}</span>
                          {grade && (
                            <Badge variant="outline" className="shrink-0 rounded-full text-label-2 text-slate-500">
                              {SUPPORT_ELIGIBILITY_GRADE_LABELS[grade as SupportEligibilityGrade] ?? grade}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="mt-auto w-full" asChild>
                    <Link href={`/support/result/${supportData.latestSessionId}`}>지원금 결과 다시보기</Link>
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
                  <Button className="mt-auto w-full" asChild>
                    <Link href="/support?start=1">지원금 찾기 시작하기</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card id="bookmarked-support" className="scroll-mt-24 rounded-xl border-0 ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-body-2">찜한 지원제도</CardTitle>
                {supportData.bookmarkCount > 0 && (
                  <Link
                    href="/mypage/bookmarks#support"
                    className="shrink-0 text-label-1 font-medium text-slate-500"
                  >
                    전체보기 →
                  </Link>
                )}
              </CardHeader>
              <CardContent className="space-y-2.5 text-label-1 text-slate-600">
                {supportData.bookmarked.length === 0 ? (
                  <p className="text-slate-400">
                    아직 찜한 지원제도가 없어요.{" "}
                    <Link href="/support" className="font-semibold text-brand-blue-600 hover:underline">
                      지원금 찾아보기 →
                    </Link>
                  </p>
                ) : (
                  supportData.bookmarked.map((program) => (
                    <Link
                      key={program.id}
                      href={`/support/${program.id}`}
                      className={cn("block rounded-lg bg-slate-50 px-3 py-2.5", interactiveRowClass)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 break-keep font-medium text-slate-800">{program.title}</p>
                        <Badge variant="outline" className="shrink-0 rounded-full text-label-2 text-slate-500">
                          {SUPPORT_CATEGORY_LABELS[program.category] ?? program.category}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-label-1 text-slate-500">
                        {labelOrganization(program.organizationName ?? program.organization)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-label-1">
                        {program.supportAmountText && (
                          <span className="font-semibold text-brand-blue-600">{program.supportAmountText}</span>
                        )}
                        <span className="text-slate-400">신청 {program.applicationPeriod ?? "상시"}</span>
                      </p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {supportData.applyHistory.length > 0 && (
              <Card className="rounded-xl border-0 ring-1 ring-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-body-2">
                    <Gift className="size-4" /> 신청 페이지로 이동한 지원제도
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-label-1 text-slate-600">
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

      </div>
    </div>
  );
}
