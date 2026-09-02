import type { Metadata } from "next";
import { listRowClass } from "@/lib/ui-classes";
import Link from "next/link";
import {
  Briefcase,
  ChevronRight,
  Compass,
  ExternalLink,
  FileText,
  Gift,
  KeyRound,
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
  getJobApplicationRepository,
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
import { JobApplicationStatusControl } from "@/features/jobs/job-application-status-control";
import { splitRecommendationTracks } from "@/features/assessment/recommendation-tracks";
import { getUserSupportBookmarkIdsAction } from "@/features/support/support-actions";
import { GRADE_BADGE_CLASS } from "@/features/support/grade-badge";
import { JourneySteps, type JourneyStep } from "@/features/mypage/journey-steps";
import { getMyPageDetail } from "@/services/user-crm.service";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/utils/phone";
import { JOB_APPLICATION_STATUS_LABELS, SUPPORT_CATEGORY_LABELS, SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";
import type { Job, JobApplication, MatchResult, SupportEligibilityGrade, SupportProgram } from "@/types";

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
 * 단계 제목. 맨 위 절차 띠의 번호와 같은 번호를 달아, 띠에서 눌러 내려온 자리가
 * 어느 단계인지 바로 잡히게 한다. 오른쪽에는 "정보 수정"처럼 그 단계의 부가 행동을 둔다.
 */
function StepHeading({
  step,
  title,
  done,
  action,
}: {
  step: number;
  title: string;
  done: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-title-3 font-bold text-slate-900">
        <span
          className={cn(
            /* leading-none: 줄 높이가 남으면 글자 상자가 원 가운데보다 살짝 위에 앉는다. */
            "flex size-8 shrink-0 items-center justify-center rounded-full text-body-2 font-bold leading-none",
            done ? "bg-brand-blue-400 text-white" : "bg-slate-100 text-slate-500",
          )}
        >
          {step}
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}

/**
 * 실회원 마이페이지 (스펙 22번). mock userId(user-1001) 의존을 완전히 제거하고
 * 현재 로그인한 auth user(requireUser)의 실제 데이터만 조회한다.
 * 데이터 원천: getMyPageDetail() - 관리자 CRM 상세(getUserCrmDetail)와 같은 저장소를 읽되,
 * 회원 화면에 안 쓰는 리드·지원제도 전체·추천 매칭은 빼서 가볍게 간다.
 *
 * 화면은 취업까지의 다섯 단계 순서로 세운다 (프로필 → 진단·지원금 → 공고 → 서류 → 지원).
 * 주 이용층인 5060 이 가입한 뒤 "그다음 뭘 하지"를 고민하지 않게, 맨 위 절차 띠가
 * 다음 할 일 하나를 짚어 주고 아래 카드들은 같은 순서로 그 단계의 입력·확인 자리가 된다.
 */
export default async function MyPage() {
  const user = await requireUser("/mypage");
  // 프로필 행이 아직 없어도(가입 직후, Mock 로그인 등) 인증 정보로 최소 프로필을 만들어 화면을 연다.
  const detail = await getMyPageDetail(user.id, {
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
  const [jobData, supportData, heldQualifications, assessmentJobs, applications] = await Promise.all([
    loadMyPageJobData(user.id),
    loadMyPageSupportData(user.id),
    // 보유 자격은 career_profiles가 아니라 Career DB(user_qualifications)가 원본이다.
    getUserQualificationRepository()
      .findByUserId(user.id)
      .catch(() => []),
    // 일자리 화면과 같은 진단 기반 공고(바로 지원 트랙·자격 따면 열리는 트랙). 없거나 실패하면 카드를 안 그린다.
    getRecommendedJobsFromAssessment({ userId: user.id }, 3).catch(() => null),
    // 회원이 직접 표시한 지원·면접·취업. 외부 지원이라 이것만이 5단계의 근거다.
    getJobApplicationRepository()
      .findAllByUser(user.id)
      .catch(() => [] as JobApplication[]),
  ]);
  const heldQualificationNames = [...new Set(heldQualifications.map((q) => q.name))];
  function labelAccountEmail(email?: string | null) {
    if (!email) return "-";
    if (!email.endsWith("@social.baroemp.app")) return email;
    return email.startsWith("nv") ? "네이버 계정으로 가입" : "카카오 계정으로 가입";
  }
  /*
    가입 때 career_profiles 행은 빈 값으로 먼저 생긴다. 온보딩을 건너뛰면 행은 있지만 알맹이가 없어
    "-" 일곱 줄만 나왔다. 값이 하나라도 있어야 채운 것으로 본다.
  */
  const hasCareerProfile = Boolean(
    careerProfile &&
      (careerProfile.employmentStatus ||
        careerProfile.region ||
        careerProfile.desiredJobCategories?.length ||
        careerProfile.desiredWorkTypes?.length ||
        careerProfile.desiredSalaryMin ||
        careerProfile.desiredSalaryMax ||
        careerProfile.desiredStartTiming),
  );

  const userName = profile.name ?? "회원";
  const resumeCount = detail.resumeSummary.resumeCount;
  const coverLetterCount = detail.resumeSummary.coverLetterCount;

  /*
    5단계 "지원하기" 줄: 지원 페이지로 이동한 공고 + 회원이 직접 표시한 공고를 합친다.
    "이동"은 우리가 아는 것, "지원했어요"는 회원이 알려준 것이다. 완료 판정은 후자만 쓴다 -
    외부 사이트에서 실제로 지원했는지는 우리가 확인할 수 없다.
  */
  const applicationByJob = new Map(applications.map((a) => [a.jobId, a]));
  const movedJobs = new Map<string, { job: Job; occurredAt: string }>();
  for (const row of jobData.applyHistory) if (!movedJobs.has(row.job.id)) movedJobs.set(row.job.id, row);
  const reportedOnlyJobs = (
    await Promise.all(
      applications
        .filter((a) => !movedJobs.has(a.jobId))
        .map((a) => getJobRepository().findById(a.jobId).catch(() => null)),
    )
  ).filter((j): j is Job => Boolean(j));
  const applyRows = [
    ...[...movedJobs.values()].map(({ job, occurredAt }) => ({ job, at: applicationByJob.get(job.id)?.reportedAt ?? occurredAt })),
    ...reportedOnlyJobs.map((job) => ({ job, at: applicationByJob.get(job.id)!.reportedAt })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  const hiredCount = applications.filter((a) => a.status === "hired").length;
  const interviewCount = applications.filter((a) => a.status === "interview" || a.status === "hired").length;
  const hasApplied = applications.length > 0;
  const applyDetail = hiredCount > 0
    ? "취업 성공"
    : hasApplied
      ? `지원 ${applications.length}건${interviewCount > 0 ? ` · 면접 ${interviewCount}` : ""}`
      : movedJobs.size > 0
        ? `이동 ${movedJobs.size}건 · 표시 전`
        : "아직 지원 전";

  /*
    완료 판정은 이미 쌓이는 데이터로 역산한다 (별도 진행률 테이블 없음).
    각 단계의 href 는 "그 단계를 하러 가는 곳", anchor 는 "이 화면 안의 그 단계 카드"다.
  */
  const steps: JourneyStep[] = [
    {
      id: "profile",
      step: 1,
      title: "취업 프로필",
      detail: hasCareerProfile ? "입력 완료" : "아직 안 채움",
      done: hasCareerProfile,
      href: hasCareerProfile ? "/mypage/profile" : "/onboarding/profile",
      actionLabel: "취업 프로필 채우기",
      todoMessage: "희망 직종·지역을 알려주시면 맞춤 공고와 지원금을 골라드려요.",
      anchor: "#step-profile",
    },
    {
      id: "diagnosis",
      step: 2,
      title: "직업진단 · 지원금",
      detail: [latestResult ? "직업진단 완료" : "직업진단 전", supportData.latestSessionId ? "지원금 완료" : "지원금 전"].join(
        " · ",
      ),
      done: Boolean(latestResult),
      href: "/assessment?start=1",
      actionLabel: "직업진단 시작하기",
      todoMessage: "몇 가지 질문으로 나에게 맞는 직업을 찾고, 받을 수 있는 지원금도 확인해요.",
      anchor: "#step-diagnosis",
    },
    {
      id: "jobs",
      step: 3,
      title: "공고 알아보기",
      detail: `찜한 일자리 ${jobData.bookmarkCount} · 지원제도 ${supportData.bookmarkCount}`,
      /* 카드에 보이는 것(찜)만 근거로 삼는다. 보이지 않는 클릭 기록으로 완료가 되면 "값이 없는데 왜 찼지"가 된다. */
      done: jobData.bookmarkCount > 0 || supportData.bookmarkCount > 0,
      href: "/jobs",
      actionLabel: "맞춤 공고 보러 가기",
      todoMessage: "내 조건에 맞는 공고를 둘러보고 마음에 드는 곳을 찜해 두세요.",
      anchor: "#step-jobs",
    },
    {
      id: "documents",
      step: 4,
      title: "이력서 · 자소서",
      detail: `이력서 ${resumeCount} · 자기소개서 ${coverLetterCount}`,
      done: resumeCount > 0,
      href: "/resume/new",
      actionLabel: "이력서 만들기",
      todoMessage: "이력서를 만들고 AI 첨삭으로 다듬으면 지원 준비가 끝나요.",
      anchor: "#step-documents",
    },
    {
      id: "apply",
      step: 5,
      title: "지원하기",
      detail: applyDetail,
      done: hasApplied,
      /* 이동한 공고가 있으면 "지원했어요"를 표시하러 5단계 카드로, 없으면 공고를 찾으러. */
      href: movedJobs.size > 0 ? "#step-apply" : jobData.bookmarkCount > 0 ? "/mypage/bookmarks#jobs" : "/jobs",
      actionLabel: movedJobs.size > 0 ? "지원 여부 표시하기" : jobData.bookmarkCount > 0 ? "찜한 공고에 지원하기" : "공고에 지원하기",
      todoMessage:
        movedJobs.size > 0
          ? "지원 페이지로 이동한 공고가 있어요. 지원하셨다면 표시해 주세요."
          : "준비가 끝났어요. 마음에 든 공고부터 지원해 보세요.",
      anchor: "#step-apply",
    },
  ];
  const stepDone = Object.fromEntries(steps.map((s) => [s.id, s.done]));

  /* 카드 안 공고 한 줄. 여러 카드가 같은 모양을 써서 한 곳에 둔다. */
  const jobRow = (job: Job) => (
    <Link key={job.id} href={`/jobs/${job.id}`} className={listRowClass}>
      <span className="min-w-0">
        <span className="block truncate text-body-2 font-semibold text-slate-800">{job.title}</span>
        <span className="mt-1 block truncate text-label-2 text-slate-400">
          {[job.companyName, job.regionSigungu ?? labelRegion(job.region)].filter(Boolean).join(" · ")}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-300" />
    </Link>
  );

  // 아래 여백(pb-32)은 떠 있는 절차 띠 높이만큼 더 준다. 마지막 카드가 띠에 가리지 않게.
  return (
    <div className="mx-auto max-w-5xl px-4.5 pt-10 pb-32 lg:px-8">
      {/* 제목을 "마이페이지"라고 적지 않는다. 메뉴에서 눌러 들어온 자리라 이미 알고 있다. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="text-title-2 font-bold text-slate-900 sm:text-headline-3">{userName}님</h1>
        {/* 온보딩을 건너뛴 회원은 값이 없어 "-" 배지만 달랑 남는다. 그때는 안 그린다. */}
        {careerProfile?.employmentStatus && (
          <Badge variant="outline" className="rounded-full text-label-1 text-slate-600">
            {labelEmploymentStatus(careerProfile.employmentStatus)}
          </Badge>
        )}
      </div>

      {/* 취업까지의 다섯 단계. 다음 할 일 하나를 크게 짚어 준다. */}
      <JourneySteps steps={steps} userName={userName} completedTitle={hiredCount > 0 ? "취업을 축하드려요!" : undefined} />

      {/*
        한 열로 쌓는다. 전에는 내 정보를 옆 칸에 붙여 두 열이었는데, 절차대로 내려 읽는 화면에서는
        옆 칸이 순서를 흐린다. 카드 폭이 넓어져 공고 제목도 덜 잘린다.
      */}
      <div className="mt-12 space-y-12">
        {/* ① 취업 프로필 */}
        <section id="step-profile" className="scroll-mt-24">
          <StepHeading
            step={1}
            title="취업 프로필"
            done={stepDone.profile}
            action={
              <Button variant="ghost" size="sm" asChild className="-my-2 h-auto py-2 pr-0 text-slate-500 hover:bg-transparent hover:text-slate-700">
                <Link href="/mypage/profile">정보 수정</Link>
              </Button>
            }
          />
          {/* 기본 정보와 취업 프로필은 모두 "나"에 대한 내용이라 한 카드에 나란히 담는다. */}
          <Card className={myPageCardClass}>
            <CardContent className="grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                  <UserRound className="size-4" /> 기본 정보
                </h3>
                <dl className="space-y-2.5">
                  <InfoRow label="이름" value={profile.name ?? "-"} />
                  {/*
                    소셜 가입은 nv{id}@social.baroemp.app 식의 합성 주소라 회원이 알아볼 이메일이 아니다.
                    어느 계정으로 가입했는지를 적는다 (social-oauth.ts 의 접두어 규칙).
                  */}
                  <InfoRow label="이메일" value={labelAccountEmail(profile.email)} />
                  <InfoRow label="휴대전화" value={formatPhone(profile.phone)} />
                  <InfoRow label="가입일" value={profile.createdAt.slice(0, 10)} />
                </dl>
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                  <Briefcase className="size-4" /> 취업 프로필
                </h3>
                {!hasCareerProfile ? (
                  /* "-" 줄 대신 왜 비었는지와 채우러 갈 길을 둔다. */
                  <div className="space-y-3">
                    <p className="text-label-1 leading-relaxed text-slate-500">
                      아직 취업 프로필을 설정하지 않았어요. 희망 직종·지역을 알려주시면 맞춤 공고를 골라드려요.
                    </p>
                    <Button className="w-full bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                      <Link href="/onboarding/profile">취업 프로필 채우기</Link>
                    </Button>
                  </div>
                ) : (
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
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ② 직업진단 · 지원금 */}
        <section id="step-diagnosis" className="scroll-mt-24">
          <StepHeading step={2} title="직업진단 · 지원금 찾기" done={stepDone.diagnosis} />
          <div className="grid gap-4 lg:grid-cols-2">
            {latestResult ? (
              <Card className={myPageCardClass}>
                {/* 검사일은 제목의 부가 정보라 오른쪽 위에 둔다. 본문 첫 줄을 차지하지 않게. */}
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
                  <div className="mt-auto flex gap-2 pt-1">
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
                  <Button className="mt-auto w-full bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                    <Link href="/assessment?start=1">직업진단 시작</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

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
                  <Button variant="outline" className="mt-auto w-full text-brand-blue-600 hover:bg-brand-blue-50" asChild>
                    <Link href="/support?start=1">지원금 찾기 시작하기</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* ③ 공고 알아보기 */}
        <section id="step-jobs" className="scroll-mt-24">
          <StepHeading
            step={3}
            title="공고 알아보기"
            done={stepDone.jobs}
            action={
              <Link href="/jobs" className="text-label-1 font-medium text-slate-500">
                일자리 찾기 →
              </Link>
            }
          />
          <div className="space-y-4">
            {jobData.recommended.length > 0 && (
              <Card className={myPageCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                    <Sparkles className="size-4" /> 맞춤 일자리
                  </CardTitle>
                </CardHeader>
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
                        {/* 점수 숫자는 회원에게 뜻이 없다. 가장 크게 맞은 조건(희망 직종 일치 등)을 대신 보여준다. */}
                        {job.match?.reasons[0] && (
                          <span className="rounded-full bg-brand-blue-50 px-2.5 py-1 text-label-2 font-semibold text-brand-blue-700">
                            {job.match.reasons[0].label}
                          </span>
                        )}
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                    <Compass className="size-4" /> 진단 기반 공고
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-label-1 text-slate-600">
                  {assessmentJobs.ready && (
                    <div>
                      <p className="mb-1.5 text-label-1 font-semibold text-slate-500">
                        지금 바로 지원 · {assessmentJobs.ready.occupationName}
                      </p>
                      <div>{assessmentJobs.ready.jobs.map(jobRow)}</div>
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
                      <div>{assessmentJobs.preparation.jobs.map(jobRow)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 찜한 것이 없어도 카드를 둔다. 없으면 없다고 적고 찾으러 갈 길을 연다. */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card id="bookmarked-jobs" className={cn("scroll-mt-24", myPageCardClass)}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                    <Star className="size-4" /> 찜한 일자리
                  </CardTitle>
                  {/* 카드에는 앞의 몇 건만 담긴다. 하나라도 있으면 전체 목록으로 가는 길을 항상 둔다. */}
                  {jobData.bookmarkCount > 0 && (
                    <Link href="/mypage/bookmarks#jobs" className="shrink-0 text-label-1 font-medium text-slate-500">
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

              <Card id="bookmarked-support" className={cn("scroll-mt-24", myPageCardClass)}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                    <Star className="size-4" /> 찜한 지원제도
                  </CardTitle>
                  {supportData.bookmarkCount > 0 && (
                    <Link href="/mypage/bookmarks#support" className="shrink-0 text-label-1 font-medium text-slate-500">
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
            </div>
          </div>
        </section>

        {/* ④ 이력서 · 자기소개서 */}
        <section id="step-documents" className="scroll-mt-24">
          <StepHeading
            step={4}
            title="이력서 · 자기소개서"
            done={stepDone.documents}
            action={
              <Link href="/resume" className="text-label-1 font-medium text-slate-500">
                전체보기 →
              </Link>
            }
          />
          <Card className={myPageCardClass}>
            <CardContent className="flex flex-1 flex-col space-y-3 text-label-1 text-slate-600">
              {/*
                이력서·자기소개서를 각각 가장 최근에 손 본 것 한 건씩. 개수는 절차 띠에 있으므로
                여기서는 "이어서 할 것"을 보여주고 누르면 그 자리로 간다.
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
              {/* 버튼이 3개라 좁은 화면에서는 세로로 쌓는다. 새로 만드는 쪽은 첫 버튼이 맡는다. */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  variant={resumeCount > 0 ? "outline" : "default"}
                  className={resumeCount > 0 ? undefined : "bg-brand-blue-400 hover:bg-brand-blue-600"}
                  asChild
                >
                  <Link href="/resume/new">이력서 만들기</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/cover-letter/new">자기소개서 작성</Link>
                </Button>
                {/* 경험뱅크는 이력서·자소서 양쪽의 재료다. */}
                <Button variant="outline" asChild>
                  <Link href="/resume#experience-bank">경험뱅크 관리</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ⑤ 지원하기 */}
        <section id="step-apply" className="scroll-mt-24">
          <StepHeading step={5} title="지원하기" done={stepDone.apply} />
          <Card className={myPageCardClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                <Briefcase className="size-4" /> 지원한 공고
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-label-1 text-slate-600">
              {/*
                지원은 워크넷 같은 외부 사이트에서 이뤄져 우리는 "지원 페이지로 이동"까지만 안다.
                그래서 회원이 직접 표시한다. 표시한 값이 곧 5단계 완료이고, 관리자도 이 값을 "회원이 알려준 것"으로 본다.
              */}
              <p className="text-label-2 text-slate-400">
                지원 페이지로 이동한 공고예요. 지원하셨다면 <strong className="font-semibold text-slate-600">지원했어요</strong>를 눌러
                표시해 주세요. 면접·취업까지 이어지면 단계를 올려 주세요.
              </p>
              {applyRows.length === 0 ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-keep">
                    아직 지원한 곳이 없어요.{" "}
                    {jobData.bookmarkCount > 0 ? "찜해 둔 공고부터 지원해 보세요." : "마음에 드는 공고를 찾아 지원해 보세요."}
                  </p>
                  <Button variant="outline" className="shrink-0 text-brand-blue-600 hover:bg-brand-blue-50" asChild>
                    <Link href={jobData.bookmarkCount > 0 ? "/mypage/bookmarks#jobs" : "/jobs"}>
                      {jobData.bookmarkCount > 0 ? "찜한 공고 보기" : "공고 찾아보기"}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div>
                  {applyRows.map(({ job, at }) => {
                    const application = applicationByJob.get(job.id);
                    return (
                      <div
                        key={job.id}
                        className="-mx-2 flex flex-col gap-2 border-b border-slate-100 px-2 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                      >
                        <Link href={`/jobs/${job.id}`} className="min-w-0 hover:underline">
                          <span className="block truncate text-body-2 font-semibold text-slate-800">{job.title}</span>
                          <span className="mt-1 block truncate text-label-2 text-slate-400">
                            {[job.companyName, job.regionSigungu ?? labelRegion(job.region)].filter(Boolean).join(" · ")} ·{" "}
                            {application
                              ? `${JOB_APPLICATION_STATUS_LABELS[application.status]} 표시 ${at.slice(0, 10)}`
                              : `지원 페이지 이동 ${at.slice(0, 10)}`}
                          </span>
                        </Link>
                        <JobApplicationStatusControl jobId={job.id} status={application?.status ?? null} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {supportData.applyHistory.length > 0 && (
            <Card className={cn("mt-4", myPageCardClass)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-body-1 font-semibold text-slate-700">
                  <Gift className="size-4" /> 신청 페이지로 이동한 지원제도
                </CardTitle>
              </CardHeader>
              <CardContent className="text-label-1 text-slate-600">
                <p className="mb-2 text-label-2 text-slate-400">
                  신청 페이지로 이동한 이력입니다. 실제 신청 완료 여부는 운영기관에서 확인해주세요.
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
        </section>
      </div>
    </div>
  );
}
