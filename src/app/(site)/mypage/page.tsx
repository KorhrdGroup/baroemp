import type { Metadata } from "next";
import { interactiveRowClass, listRowClass } from "@/lib/ui-classes";
import Link from "next/link";
import {
  Briefcase,
  ChevronRight,
  Compass,
  ExternalLink,
  FileText,
  Gift,
  KeyRound,
  Pencil,
  Sparkles,
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
  getUserQualificationRepository,
} from "@/lib/repositories";
import { activityEventLogger } from "@/lib/activity/event-logger";
import { getRecommendedJobsForUser, type JobWithMatch } from "@/services/job-search.service";
import { getRecommendedJobsFromAssessment } from "@/services/assessment-job.service";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { splitRecommendationTracks } from "@/features/assessment/recommendation-tracks";
import { getUserSupportBookmarkIdsAction } from "@/features/support/support-actions";
import { GRADE_BADGE_CLASS } from "@/features/support/grade-badge";
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
 * 마이페이지 카드 공통 틀.
 * Card 기본 여백(--card-spacing 16px)은 목록이 여러 줄 들어가는 이 화면에서 글자가 테두리에
 * 붙어 꽉 찬 느낌이라, 여기서만 24px 로 키운다. 헤더·본문 좌우와 카드 위아래에 함께 먹는다.
 */
const myPageCardClass = "rounded-xl border-0 ring-1 ring-border [--card-spacing:--spacing(6)]";

/**
 * 내 정보 카드의 한 줄. "라벨 · 값"을 한 문장으로 붙이면 전부 같은 회색이라 무엇이 값인지
 * 눈에 안 잡혔다. 라벨은 옅게 고정폭으로, 값은 진하게 나머지 폭을 쓰게 갈라 표처럼 읽힌다.
 */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-20 shrink-0 text-label-1 leading-6 text-slate-400">{label}</dt>
      <dd className="min-w-0 flex-1 break-keep text-label-1 leading-6 font-medium text-slate-800">{value}</dd>
    </div>
  );
}

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
  const [jobData, supportData, heldQualifications, assessmentJobs] = await Promise.all([
    loadMyPageJobData(user.id),
    loadMyPageSupportData(user.id),
    // 보유 자격은 career_profiles가 아니라 Career DB(user_qualifications)가 원본이다.
    getUserQualificationRepository()
      .findByUserId(user.id)
      .catch(() => []),
    // 일자리 화면과 같은 진단 기반 공고(바로 지원 트랙·자격 따면 열리는 트랙). 없거나 실패하면 카드를 안 그린다.
    getRecommendedJobsFromAssessment({ userId: user.id }, 3).catch(() => null),
  ]);
  const heldQualificationNames = [...new Set(heldQualifications.map((q) => q.name))];

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
            <h2 className="text-title-3 font-bold text-slate-900">내 정보</h2>
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
          {/*
            기본 정보와 취업 프로필은 모두 "나"에 대한 내용이라 한 카드에 담고 구분선으로만 가른다.
            제목과 표 사이는 카드 기본 간격(24px)이 너무 벌어져 보여 12px 로 붙인다.
          */}
          <Card className={cn(myPageCardClass, "gap-3")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                <UserRound className="size-4" /> 기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5">
                <InfoRow label="이름" value={profile.name ?? "-"} />
                <InfoRow label="이메일" value={profile.email ?? "-"} />
                <InfoRow label="휴대전화" value={formatPhone(profile.phone)} />
                <InfoRow label="가입일" value={profile.createdAt.slice(0, 10)} />
              </dl>
            </CardContent>

            {/* 구분선 좌우 여백은 카드 안쪽 여백(--card-spacing 24px)과 같게 맞추고, 위아래는 두 묶음이 붙지 않게 벌린다. */}
            <div className="mx-6 my-2 border-t border-slate-100" />

            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                <Briefcase className="size-4" /> 취업 프로필
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5">
                <InfoRow label="취업상태" value={labelEmploymentStatus(careerProfile?.employmentStatus)} />
                <InfoRow label="희망지역" value={labelRegion(careerProfile?.region)} />
                <InfoRow
                  label="근무형태"
                  value={
                    careerProfile?.desiredWorkTypes && careerProfile.desiredWorkTypes.length > 0
                      ? careerProfile.desiredWorkTypes.map((t) => labelWorkType(t)).join(", ")
                      : "-"
                  }
                />
                <InfoRow
                  label="희망급여"
                  value={
                    careerProfile?.desiredSalaryMin || careerProfile?.desiredSalaryMax
                      ? `${careerProfile?.desiredSalaryMin ?? "-"} ~ ${careerProfile?.desiredSalaryMax ?? "-"}만원`
                      : "-"
                  }
                />
                <InfoRow label="취업시기" value={labelDesiredStartTiming(careerProfile?.desiredStartTiming)} />
                <InfoRow label="교육의향" value={careerProfile?.isOpenToTraining ? "있음" : "-"} />
                <InfoRow
                  label="보유 자격"
                  value={
                    heldQualificationNames.length > 0 ? (
                      /* 자격은 여러 개라 쉼표로 이으면 한 덩어리로 읽힌다. 칩으로 갈라 세어지게 한다. */
                      <span className="flex flex-wrap gap-1.5">
                        {heldQualificationNames.map((name) => (
                          <span key={name} className="rounded-full bg-slate-100 px-3 py-1 text-label-1 font-medium text-slate-700">
                            {name}
                          </span>
                        ))}
                      </span>
                    ) : (
                      "-"
                    )
                  }
                />
              </dl>
            </CardContent>
          </Card>
        </aside>

        <div className="min-w-0 flex-1 space-y-10">
        <section>
          <h2 className="mb-4 text-title-3 font-bold text-slate-900">취업 준비</h2>
          <div className="space-y-4">
            {/* C. 직업진단 */}
            {latestResult ? (
              <Card className={myPageCardClass}>
                {/* 검사일은 제목의 부가 정보라 "전체보기"와 같은 자리(오른쪽 위)에 둔다. 본문 첫 줄을 차지하지 않게. */}
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                    <Compass className="size-4" /> 최근 직업진단 결과
                  </CardTitle>
                  <span className="shrink-0 text-label-1 text-slate-400">검사일 · {latestResult.completedAt.slice(0, 10)}</span>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-3 text-label-1 text-slate-600">
                  {/*
                    결과 화면과 같은 두 트랙. 준비 트랙 총점에는 자격 미보유 감점이 섞여 있어 성향 적합도를 쓴다.
                    행은 회색 상자 없이 구분선으로만 가르고, 순위·트랙은 왼쪽 동그란 배지로 읽힌다.
                  */}
                  {(() => {
                    const { ready, preparation } = splitRecommendationTracks(latestResult.recommendations);
                    return (
                      <div className="space-y-4">
                        {ready.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-label-1 font-semibold text-slate-500">지금 바로 지원할 수 있는 직업</p>
                            <div>
                              {/* 행을 누르면 결과 화면에서 그 직업 카드가 열린 채로 보인다. */}
                              {ready.slice(0, 3).map((rec, i) => (
                                <Link
                                  key={rec.occupationId}
                                  href={`/assessment/result/${latestResult.sessionId}?focus=${rec.occupationId}#occupation-${rec.occupationId}`}
                                  className={listRowClass}
                                >
                                  <span className="flex min-w-0 items-center gap-3">
                                    <span
                                      className={cn(
                                        "flex size-7 shrink-0 items-center justify-center rounded-full text-label-2 font-bold",
                                        i === 0 ? "bg-brand-blue-400 text-white" : "bg-slate-100 text-slate-500",
                                      )}
                                    >
                                      {i + 1}
                                    </span>
                                    <span className="truncate text-body-2 font-semibold text-slate-800">{rec.occupationName}</span>
                                  </span>
                                  <span className="flex shrink-0 items-center gap-2">
                                    <span className="text-body-2 font-bold text-brand-blue-600">{rec.totalScore}점</span>
                                    <ChevronRight className="size-4 text-slate-300" />
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                        {preparation.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-label-1 font-semibold text-slate-500">준비하면 열리는 직업</p>
                            <div>
                              {preparation.slice(0, 3).map((rec) => (
                                <Link
                                  key={rec.occupationId}
                                  href={`/assessment/result/${latestResult.sessionId}?focus=${rec.occupationId}#occupation-${rec.occupationId}`}
                                  className={listRowClass}
                                >
                                  <span className="flex min-w-0 items-center gap-3">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                                      <KeyRound className="size-3.5" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block truncate text-body-2 font-semibold text-slate-800">{rec.occupationName}</span>
                                      <span className="mt-1 block text-label-2 text-amber-700">자격 취득 시 가능</span>
                                    </span>
                                  </span>
                                  <span className="flex shrink-0 items-center gap-2">
                                    <span className="text-body-2 font-bold text-brand-blue-600">{rec.dimensionFitScore}점</span>
                                    <ChevronRight className="size-4 text-slate-300" />
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
              <Card className={myPageCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                    <Compass className="size-4" /> 직업진단
                  </CardTitle>
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
            <Card className={myPageCardClass}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
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
                <div>
                  {detail.resumeSummary.recentResume ? (
                    <Link href={`/resume/${detail.resumeSummary.recentResume.id}/edit`} className={listRowClass}>
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-600">
                          <FileText className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-body-2 font-semibold text-slate-800">
                            {detail.resumeSummary.recentResume.title || "제목 없는 이력서"}
                          </span>
                          <span className="mt-1 block text-label-2 text-slate-400">
                            이력서 · 완성도 {detail.resumeSummary.recentResume.completeness}% · 최근수정{" "}
                            {detail.resumeSummary.recentResume.updatedAt.slice(0, 10)}
                          </span>
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-300" />
                    </Link>
                  ) : (
                    <p className="py-1">아직 작성한 이력서가 없어요. 보유하신 정보를 불러와 빠르게 작성해보세요.</p>
                  )}
                  {detail.resumeSummary.recentCoverLetter && (
                    <Link href={`/cover-letter/${detail.resumeSummary.recentCoverLetter.id}/edit`} className={listRowClass}>
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <FileText className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-body-2 font-semibold text-slate-800">
                            {detail.resumeSummary.recentCoverLetter.title || "제목 없는 자기소개서"}
                          </span>
                          <span className="mt-1 block text-label-2 text-slate-400">
                            자기소개서 · 최근수정 {detail.resumeSummary.recentCoverLetter.updatedAt.slice(0, 10)}
                          </span>
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-300" />
                    </Link>
                  )}
                </div>
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
            <h2 className="mb-4 text-title-3 font-bold text-slate-900">일자리</h2>
            <div className="space-y-4">
              {/* D. 채용공고 */}
              {jobData.recommended.length > 0 && (
                <Card className={myPageCardClass}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                      <Sparkles className="size-4" /> 맞춤 일자리
                    </CardTitle>
                  </CardHeader>
                  {/* 카드가 반 칸이 되어 2열로 나누면 공고 제목이 심하게 잘린다. 다른 목록 카드와 같이 한 열로 둔다. */}
                  <CardContent className="text-label-1 text-slate-600">
                    {jobData.recommended.map((job) => (
                      <Link key={job.id} href={`/jobs/${job.id}`} className={listRowClass}>
                        <span className="min-w-0">
                          <span className="block truncate text-body-2 font-semibold text-slate-800">{job.title}</span>
                          <span className="mt-1 block truncate text-label-2 text-slate-400">
                            {[job.companyName, job.regionSigungu ?? labelRegion(job.region)].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {job.match && <span className="text-body-2 font-bold text-brand-blue-600">{job.match.score}점</span>}
                          <ChevronRight className="size-4 text-slate-300" />
                        </span>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/*
                진단 기반 공고. 위 "최근 직업진단 결과"가 직업을 보여줬다면 여기는 그 직업의 실제 공고다.
                바로 지원 트랙과 자격 따면 열리는 트랙을 결과 카드와 같은 두 묶음으로 둔다.
              */}
              {assessmentJobs && (assessmentJobs.ready || assessmentJobs.preparation) && (
                <Card className={myPageCardClass}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                      <Compass className="size-4" /> 진단 기반 공고
                    </CardTitle>
                    <Link href="/jobs" className="shrink-0 text-label-1 font-medium text-slate-500">
                      일자리 찾기 →
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-4 text-label-1 text-slate-600">
                    {assessmentJobs.ready && (
                      <div>
                        <p className="mb-1.5 text-label-1 font-semibold text-slate-500">
                          지금 바로 지원 · {assessmentJobs.ready.occupationName}
                        </p>
                        <div>
                          {assessmentJobs.ready.jobs.map((job) => (
                            <Link key={job.id} href={`/jobs/${job.id}`} className={listRowClass}>
                              <span className="min-w-0">
                                <span className="block truncate text-body-2 font-semibold text-slate-800">{job.title}</span>
                                <span className="mt-1 block truncate text-label-2 text-slate-400">
                                  {[job.companyName, job.regionSigungu ?? labelRegion(job.region)].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                              <ChevronRight className="size-4 shrink-0 text-slate-300" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {assessmentJobs.preparation && (
                      <div>
                        <p className="mb-1.5 flex flex-wrap items-center gap-x-1.5 text-label-1 font-semibold text-slate-500">
                          <KeyRound className="size-3.5 text-amber-600" />
                          자격 따면 열리는 · {assessmentJobs.preparation.occupationName}
                          {assessmentJobs.preparation.missingQualifications?.length ? (
                            <span className="font-medium text-amber-700">
                              ({assessmentJobs.preparation.missingQualifications.join(", ")} 취득 시)
                            </span>
                          ) : null}
                        </p>
                        <div>
                          {assessmentJobs.preparation.jobs.map((job) => (
                            <Link key={job.id} href={`/jobs/${job.id}`} className={listRowClass}>
                              <span className="min-w-0">
                                <span className="block truncate text-body-2 font-semibold text-slate-800">{job.title}</span>
                                <span className="mt-1 block truncate text-label-2 text-slate-400">
                                  {[job.companyName, job.regionSigungu ?? labelRegion(job.region)].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                              <ChevronRight className="size-4 shrink-0 text-slate-300" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/*
                찜한 것이 없다고 카드를 통째로 감추면, 맨 위 요약에서 "찜한 공고 0"을 보고
                내려온 사람이 그 자리에서 아무것도 못 찾는다. 없으면 없다고 적어준다.
              */}
              <Card id="bookmarked-jobs" className={cn("scroll-mt-24", myPageCardClass)}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                    <Star className="size-4" /> 찜한 일자리
                  </CardTitle>
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
                <CardContent className="text-label-1 text-slate-600">
                  {jobData.bookmarked.length === 0 ? (
                    <p className="py-1 text-slate-400">
                      아직 찜한 일자리가 없어요.{" "}
                      <Link href="/jobs" className="font-semibold text-brand-blue-600 hover:underline">
                        일자리 찾아보기 →
                      </Link>
                    </p>
                  ) : (
                    jobData.bookmarked.map((job) => (
                      <Link key={job.id} href={`/jobs/${job.id}`} className={listRowClass}>
                        <span className="min-w-0">
                          {/* break-keep 이 없으면 한글이 음절 단위로 잘려 "모집합니 / 다." 처럼 끊긴다. */}
                          <span className="line-clamp-2 break-keep text-body-2 font-semibold text-slate-800">{job.title}</span>
                          <span className="mt-1 block truncate text-label-2 text-slate-400">
                            {[job.companyName, job.regionSigungu ?? labelRegion(job.region)].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-body-2 font-bold text-brand-blue-600">{formatSalary(job)}</span>
                          {job.applyDeadline && (
                            <span className="text-label-2 text-slate-400">
                              마감 {job.applyDeadline.slice(5, 10).replace("-", ".")}
                            </span>
                          )}
                        </span>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>

              {jobData.applyHistory.length > 0 && (
                <Card id="apply-history" className={cn("scroll-mt-24", myPageCardClass)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                      <Briefcase className="size-4" /> 지원 페이지로 이동한 일자리
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-label-1 text-slate-600">
                    <p className="mb-2 text-label-2 text-slate-400">
                      아래 공고는 지원 페이지로 이동한 이력입니다. 실제 지원 완료 여부는 각 사이트에서 확인해주세요.
                    </p>
                    <div>
                      {jobData.applyHistory.map(({ job, occurredAt }) => (
                        <Link key={`${job.id}-${occurredAt}`} href={`/jobs/${job.id}`} className={listRowClass}>
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                              <ExternalLink className="size-3.5" />
                            </span>
                            <span className="truncate text-body-2 font-semibold text-slate-800">{job.title}</span>
                          </span>
                          <span className="shrink-0 text-label-2 text-slate-400">{occurredAt.slice(0, 10)}</span>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
        </section>

        <section>
          <h2 className="mb-4 text-title-3 font-bold text-slate-900">지원제도</h2>
          <div className="space-y-4">
            {/* E. 지원제도 */}
            {supportData.latestSessionId ? (
              <Card className={myPageCardClass}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                    <Gift className="size-4" /> 지원금 진단 결과
                  </CardTitle>
                  {supportData.latestCompletedAt && (
                    <span className="shrink-0 text-label-1 text-slate-400">
                      검사일 · {supportData.latestCompletedAt.slice(0, 10)}
                    </span>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-3 text-label-1 text-slate-600">
                  {/* 검사일과 버튼만 있으면 무엇이 나왔는지 다시 들어가 봐야 안다. 직업진단처럼 상위 몇 건을 적는다. */}
                  {supportData.topMatches.length > 0 && (
                    <div>
                      {supportData.topMatches.map(({ program, grade }) => (
                        <Link key={program.id} href={`/support/${program.id}`} className={listRowClass}>
                          <span className="truncate text-body-2 font-semibold text-slate-800">{program.title}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            {/* 지원금 목록 카드와 같은 등급 색을 쓴다 - 여기서만 회색이면 다른 등급처럼 읽힌다. */}
                            {grade && (
                              <Badge
                                className={cn(
                                  "rounded-full border-0 text-label-2 font-semibold",
                                  GRADE_BADGE_CLASS[grade as SupportEligibilityGrade] ?? "bg-slate-100 text-slate-500",
                                )}
                              >
                                {SUPPORT_ELIGIBILITY_GRADE_LABELS[grade as SupportEligibilityGrade] ?? grade}
                              </Badge>
                            )}
                            <ChevronRight className="size-4 text-slate-300" />
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="mt-auto w-full" asChild>
                    <Link href={`/support/result/${supportData.latestSessionId}`}>지원금 결과 다시보기</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className={myPageCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
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

            <Card id="bookmarked-support" className={cn("scroll-mt-24", myPageCardClass)}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                  <Star className="size-4" /> 찜한 지원제도
                </CardTitle>
                {supportData.bookmarkCount > 0 && (
                  <Link
                    href="/mypage/bookmarks#support"
                    className="shrink-0 text-label-1 font-medium text-slate-500"
                  >
                    전체보기 →
                  </Link>
                )}
              </CardHeader>
              <CardContent className="text-label-1 text-slate-600">
                {supportData.bookmarked.length === 0 ? (
                  <p className="py-1 text-slate-400">
                    아직 찜한 지원제도가 없어요.{" "}
                    <Link href="/support" className="font-semibold text-brand-blue-600 hover:underline">
                      지원금 찾아보기 →
                    </Link>
                  </p>
                ) : (
                  supportData.bookmarked.map((program) => (
                    <Link key={program.id} href={`/support/${program.id}`} className={listRowClass}>
                      <span className="min-w-0">
                        <span className="line-clamp-2 break-keep text-body-2 font-semibold text-slate-800">{program.title}</span>
                        <span className="mt-1 block truncate text-label-2 text-slate-400">
                          {labelOrganization(program.organizationName ?? program.organization)} · 신청{" "}
                          {program.applicationPeriod ?? "상시"}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {program.supportAmountText && (
                          <span className="text-body-2 font-bold text-brand-blue-600">{program.supportAmountText}</span>
                        )}
                        <Badge variant="outline" className="rounded-full text-label-2 text-slate-500">
                          {SUPPORT_CATEGORY_LABELS[program.category] ?? program.category}
                        </Badge>
                      </span>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {supportData.applyHistory.length > 0 && (
              <Card className={myPageCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                    <Gift className="size-4" /> 신청 페이지로 이동한 지원제도
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-label-1 text-slate-600">
                  <p className="mb-2 text-label-2 text-slate-400">
                    아래 제도는 신청 페이지로 이동한 이력입니다. 실제 신청 완료 여부는 운영기관에서 확인해주세요.
                  </p>
                  <div>
                    {supportData.applyHistory.map(({ program, occurredAt }) => (
                      <Link key={`${program.id}-${occurredAt}`} href={`/support/${program.id}`} className={listRowClass}>
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            <ExternalLink className="size-3.5" />
                          </span>
                          <span className="truncate text-body-2 font-semibold text-slate-800">{program.title}</span>
                        </span>
                        <span className="shrink-0 text-label-2 text-slate-400">{occurredAt.slice(0, 10)}</span>
                      </Link>
                    ))}
                  </div>
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
