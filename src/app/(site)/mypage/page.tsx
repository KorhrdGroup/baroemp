import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, ChevronRight, Compass, FileText, Gift, UserRound, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { labelJobCategory, labelRegion, labelWorkType } from "@/lib/labels";
import {
  getJobApplicationRepository,
  getJobRepository,
  getMatchResultRepository,
  getSupportAssessmentSessionRepository,
} from "@/lib/repositories";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { getUserSupportBookmarkIdsAction } from "@/features/support/support-actions";
import { splitRecommendationTracks } from "@/features/assessment/recommendation-tracks";
import { JourneyProgress, JourneySteps, type JourneyStep } from "@/features/mypage/journey-steps";
import { JobAlertPanel } from "@/features/mypage/job-alert-panel";
import { getMyPageDetail } from "@/services/user-crm.service";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/utils/phone";
import type { JobApplication } from "@/types";
import { JobApplicationStatusControl } from "@/features/jobs/job-application-status-control";
import { getJobAlertSettings, listMyJobAlerts } from "@/services/job-alert.service";

interface MyPageSupportData {
  latestSessionId?: string;
  /** 진단 결과 가운데 "가능성 높음" 건수와 전체 건수. 결과 화면과 같은 값(match_results)을 읽는다. */
  highCount: number;
  matchCount: number;
}

async function loadMyPageSupportData(userId: string): Promise<MyPageSupportData> {
  try {
    const [sessions, matches] = await Promise.all([
      getSupportAssessmentSessionRepository().findAll({ userId, status: "completed" }),
      getMatchResultRepository().findAll({ sourceId: userId, targetType: "support_program" }),
    ]);
    const latestSession = [...sessions].sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1))[0];
    return {
      latestSessionId: latestSession?.id,
      highCount: matches.filter((m) => m.grade === "HIGH").length,
      matchCount: matches.length,
    };
  } catch {
    return { highCount: 0, matchCount: 0 };
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

/** ISO 시각을 한국 날짜 "11.26" 으로. 서버는 UTC 라 그대로 자르면 아침 9시 전 표시가 하루 앞 날짜가 된다. */
function formatKstMonthDay(iso: string) {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(5, 10).replace("-", ".");
}

/**
 * "나의 취업 준비" 목록의 한 줄. 휴대폰 설정 화면처럼 줄 전체가 누르는 자리다.
 * 5060 회원이 작은 글자 링크를 찾아 누르지 않아도 되게, 줄 어디를 눌러도 그 화면으로 간다.
 *
 * 한 일과 안 한 일이 한눈에 갈리게 왼쪽 동그라미 색을 바꾼다:
 * 다 한 일은 파랑 바탕 + 흰 그림(채워진 것 = 끝난 것), 아직은 회색, 다음에 할 일은 줄 전체를 옅은 파랑으로 띄운다.
 *
 * 빽빽하지 않게 글을 덜어 낸다: 다 한 일은 제목 한 줄에 결과 한 마디("8개 찾았어요")만 오른쪽에 회색으로,
 * 설명은 아직 안 한 줄에만 붙인다. 파랑 글자는 "지금 하기" 하나뿐이다.
 * 휴대폰은 오른쪽에 둘 자리가 없어 결과 한 마디를 제목 아래로 내린다.
 *
 * 넓은 화면(xl, 1280px 이상)에서는 한 줄이 1200px 넘게 늘어나 제목과 오른쪽 결과가 너무 멀어졌다.
 * 그래서 다섯 단계를 카드 다섯 장으로 가로로 놓는다. 1024px 에서는 카드가 좁아 글이 꺾여 줄 모양을 그대로 둔다. 진행 막대와 같은 순서로 읽히고, 결과가 제목 바로 아래 붙는다.
 * 다음에 할 단계는 옅은 파랑 바탕에 아래 "지금 하기".
 */
function MenuRow({
  step,
  href,
  icon: Icon,
  title,
  result,
  description,
  action,
  done,
  isNext,
  doneAction,
}: {
  /** 단계 순서(들어올 때 떠오르는 차례). */
  step: number;
  href: string;
  icon: LucideIcon;
  title: string;
  /** 다 했을 때 결과 한 마디. */
  result: string;
  /** 아직 안 했을 때 무엇을 하는지 한 줄. */
  description: string;
  /** 아직 안 했고 다음 차례도 아닐 때 오른쪽 글자. */
  action: string;
  done: boolean;
  isNext: boolean;
  /** 다 했을 때 넓은 화면 카드 맨 아래 글자(다시 볼 곳). */
  doneAction: string;
}) {
  return (
    /* 들어올 때 단계 순서대로 떠오르고(.mp-rise), 다 한 단계 동그라미는 뒤이어 톡 켜진다(.mp-pop) - globals.css. */
    <li className="mp-rise border-t border-slate-100 first:border-t-0 xl:border-t-0" style={{ ["--mp-d" as string]: `${280 + (step - 1) * 80}ms` }}>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-4 px-5 py-6 sm:px-7 xl:h-full xl:min-h-64 xl:flex-col xl:items-stretch xl:gap-0 xl:rounded-card xl:p-7 xl:transition-shadow xl:duration-200",
          /* 넓은 화면에서 옅은 파랑 판은 회색 바탕에 묻혀, 다음 할 카드도 흰 카드로 두고 파란 기운 그림자(위치 0,0)로만 살짝 띄운다. */
          /* 마우스를 올리면 다른 카드와 같은 그림자(shadow-hover). 다음 할 카드는 원래 그림자를 조금 더 진하게. */
          isNext
            ? "bg-baro-blue-50 xl:bg-white xl:shadow-[0_0_16px_rgba(36,105,255,0.16)] xl:hover:shadow-[0_0_16px_rgba(36,105,255,0.26)]"
            : "xl:bg-white xl:hover:shadow-hover",
        )}
      >
        <span className="flex shrink-0 items-center justify-between">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full xl:size-12",
              done ? "mp-pop bg-baro-blue text-white" : isNext ? "bg-white text-baro-blue xl:bg-baro-blue-50" : "bg-slate-100 text-slate-500",
            )}
          >
            <Icon className="size-5" />
          </span>
          {isNext ? (
            <span aria-hidden className="hidden text-body-3 font-semibold text-baro-blue-600 xl:inline">
              지금 할 차례
            </span>
          ) : (
            /* "N단계" 번호는 두지 않는다 - 순서는 카드 줄 순서로 충분하다. 다 한 카드만 "완료"를 적는다. */
            done && (
              <span aria-hidden className="hidden text-body-3 font-semibold text-slate-600 xl:inline">
                완료
              </span>
            )
          )}
        </span>
        <span className="min-w-0 flex-1 xl:mt-7 xl:flex-none">
          <span className="block text-body-1 font-semibold break-keep text-slate-900">
            {title}
            <span className="sr-only">{done ? " (완료)" : isNext ? " (다음에 할 일)" : ""}</span>
          </span>
          {done ? (
            <span className="mt-0.5 block truncate text-body-2 font-medium text-slate-600 sm:hidden xl:mt-2 xl:block xl:leading-relaxed xl:font-semibold xl:break-keep xl:whitespace-normal">
              {result}
            </span>
          ) : (
            <span className="mt-0.5 block text-body-2 font-medium break-keep text-slate-600 xl:mt-2 xl:leading-relaxed">{description}</span>
          )}
        </span>
        <span
          className={cn(
            "hidden shrink-0 text-body-2 sm:inline xl:hidden",
            done ? "font-semibold text-slate-600" : isNext ? "font-semibold text-baro-blue-600" : "font-semibold text-slate-600",
          )}
        >
          {done ? result : isNext ? "지금 하기" : action}
        </span>
        {/* 넓은 화면 카드는 맨 아래에 할 일 글자를 둔다. 다 한 카드는 결과가 이미 위에 있어 비운다. */}
        {/* 다 한 카드도 같은 자리에 다시 볼 곳(doneAction)을 적어, 몇 단계를 했든 다섯 장의 아랫줄이 맞는다. */}
        <span
          aria-hidden
          className={cn(
            "mt-auto hidden pt-6 text-body-2 font-semibold xl:block",
            isNext ? "text-white" : "text-slate-600",
          )}
        >
          <span className={cn("inline-flex items-center gap-1", isNext && "h-11 rounded-full bg-baro-blue px-5")}>
            {done ? doneAction : isNext ? "지금 하기" : action}
            <ChevronRight className="size-4" />
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400 xl:hidden" />
      </Link>
    </li>
  );
}

/**
 * 실회원 마이페이지 (스펙 22번). 현재 로그인한 auth user(requireUser)의 실제 데이터만 조회한다.
 * 데이터 원천: getMyPageDetail() - 관리자 CRM 상세(getUserCrmDetail)와 같은 저장소를 읽되,
 * 회원 화면에 안 쓰는 리드·지원제도 전체·추천 매칭은 빼서 가볍게 간다.
 *
 * 주 이용층인 5060 이 정신없지 않게 세 덩이로만 짠다:
 * ① 인사 · 진행 막대 · 다음 할 일 한 장  ② 나의 취업 준비 - 막대와 같은 다섯 단계를 한 줄씩(넓은 화면은 카드 다섯 장)  ③ 알림 - 공고 알림 한 줄.
 * 진단 결과 · 공고 · 서류 목록은 여기 늘어놓지 않고 각 화면으로 보낸다. 줄마다 현황 한 줄이면 된다.
 */
export default async function MyPage() {
  const user = await requireUser("/mypage");
  const [jobAlertSettings, myJobAlerts] = await Promise.all([getJobAlertSettings(user.id), listMyJobAlerts(user.id)]);
  // 프로필 행이 아직 없어도(가입 직후, Mock 로그인 등) 인증 정보로 최소 프로필을 만들어 화면을 연다.
  const detail = await getMyPageDetail(user.id, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  if (!detail) {
    return (
      <div className="mx-auto max-w-7xl px-4.5 pt-10 pb-20 lg:px-8">
        <EmptyState icon={UserRound} title="프로필을 불러올 수 없습니다" description="잠시 후 다시 시도해주세요." />
      </div>
    );
  }

  /*
    lead(영업용 등급·점수)는 꺼내지 않는다. 회원에게 보여줄 값이 아니고, 관리자도
    여기가 아니라 관리자 회원상세에서 본다.
  */
  const { profile, careerProfile, assessmentResults } = detail;
  const latestResult = assessmentResults[0];
  const [jobBookmarkIds, supportBookmarkIds, supportData, applications] = await Promise.all([
    getUserJobBookmarkIdsAction().catch(() => [] as string[]),
    getUserSupportBookmarkIdsAction().catch(() => [] as string[]),
    loadMyPageSupportData(user.id),
    // 회원이 직접 표시한 지원·면접·취업. 외부 지원이라 다섯 단계를 마친 뒤 맨 위 카드의 근거가 된다.
    getJobApplicationRepository()
      .findAllByUser(user.id)
      .catch(() => [] as JobApplication[]),
  ]);
  /* "지원한 공고" 칸에 쓸 공고 제목 · 회사. 회원이 손으로 표시한 것이라 건수가 적어 한 건씩 불러온다. 공고가 지워졌으면 뺀다. */
  const appliedJobs = (
    await Promise.all(
      applications.map(async (a) => {
        const job = await getJobRepository()
          .findById(a.jobId)
          .catch(() => null);
        return job ? { application: a, job } : null;
      }),
    )
  ).filter((row) => row !== null);
  const jobBookmarkCount = jobBookmarkIds.length;
  const supportBookmarkCount = supportBookmarkIds.length;

  /*
    가입 때 career_profiles 행은 빈 값으로 먼저 생긴다. 온보딩을 건너뛰면 행은 있지만 알맹이가 없다.
    값이 하나라도 있어야 채운 것으로 본다.
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

  /* 맞춤 공고 목록은 맞춤의 근거인 희망 직종·지역을 그대로 필터로 걸어 연다. */
  const desiredCategories = careerProfile?.desiredJobCategories ?? [];
  const jobsParams = new URLSearchParams();
  if (desiredCategories.length) jobsParams.set("category", desiredCategories.join(","));
  if (careerProfile?.region) jobsParams.set("region", careerProfile.region);
  const jobsHref = `/jobs${jobsParams.size ? `?${jobsParams}` : ""}`;
  const jobsBasis = [
    careerProfile?.region ? labelRegion(careerProfile.region) : undefined,
    desiredCategories.map((c) => labelJobCategory(c)).find(Boolean),
  ].filter(Boolean);

  /*
    취업 준비 다섯 단계. 진행 막대와 "나의 취업 준비" 목록이 이 다섯 개를 똑같이 센다 -
    전에는 막대(프로필 · 진단 · 찜 · 서류 · 지원)와 목록 줄이 서로 달라 "3개 했어요"와 "3 / 5"가 다른 것을 셌다.
    지원은 사이트 밖에서 하는 일이라 단계로 세지 않고, 다섯 개를 다 마치면 맨 위 카드가 지원을 권한다.
    완료 판정은 이미 쌓이는 데이터로 역산한다 (별도 진행률 테이블 없음). href 는 "그 단계를 하러 가는 곳"이다.
  */
  const steps: JourneyStep[] = [
    {
      id: "profile",
      step: 1,
      title: "희망 조건 채우기",
      done: hasCareerProfile,
      href: "/onboarding/profile",
      actionLabel: "희망 조건 채우기",
      todoMessage: "희망 직종·지역을 알려주시면 맞춤 공고와 지원금을 골라드려요.",
    },
    {
      id: "diagnosis",
      step: 2,
      title: "나에게 맞는 직업 찾기",
      done: Boolean(latestResult),
      href: "/assessment?start=1",
      actionLabel: "직업진단 시작하기",
      todoMessage: "몇 가지 질문에 답하면 맞는 직업을 알려드려요. 약 3~5분 걸려요.",
    },
    {
      id: "support",
      step: 3,
      title: "받을 수 있는 지원금 찾기",
      done: Boolean(supportData.latestSessionId),
      href: "/support?start=1",
      actionLabel: "지원금 찾기 시작하기",
      todoMessage: "몇 가지 조건만 고르면 받을 수 있는 지원금을 찾아드려요. 약 2~3분 걸려요.",
    },
    {
      id: "jobs",
      step: 4,
      title: "마음에 드는 일자리 찜하기",
      /* 화면에 보이는 것(찜)만 근거로 삼는다. 보이지 않는 클릭 기록으로 완료가 되면 "값이 없는데 왜 찼지"가 된다. */
      done: jobBookmarkCount > 0,
      href: jobsHref,
      actionLabel: "맞춤 일자리 보러 가기",
      todoMessage: "내 조건에 맞는 공고를 둘러보고 마음에 드는 곳을 찜해 두세요.",
    },
    {
      id: "documents",
      step: 5,
      title: "이력서 만들기",
      done: resumeCount > 0,
      href: "/resume/new",
      actionLabel: "이력서 만들기",
      todoMessage: "이력서를 만들고 AI 첨삭으로 다듬으면 지원 준비가 끝나요.",
    },
  ];
  const stepDone = Object.fromEntries(steps.map((s) => [s.id, s.done]));
  const nextStepId = steps.find((s) => !s.done)?.id;

  /* 지원의 근거는 회원이 공고 상세에서 직접 표시한 값(job_applications)뿐이다. */
  const hiredCount = applications.filter((a) => a.status === "hired").length;
  const interviewCount = applications.filter((a) => a.status === "interview" || a.status === "hired").length;
  const applyHref = jobBookmarkCount > 0 ? "/mypage/bookmarks" : jobsHref;
  /* 다섯 단계를 다 마친 뒤 맨 위 카드. 취업까지 표시했으면 카드 없이 제목이 축하한다. */
  const goal =
    hiredCount > 0
      ? undefined
      : applications.length > 0
        ? {
            label: "지원 현황",
            title: "좋은 소식을 기다릴게요",
            message: `지원 ${applications.length}건${interviewCount > 0 ? ` · 면접 ${interviewCount}회` : ""}. 면접이나 합격 소식이 있으면 아래 지원한 공고에서 바로 바꿔 주세요.`,
            href: applyHref,
            actionLabel: "공고 더 보기",
          }
        : {
            label: "준비 끝",
            title: "이제 지원할 차례예요",
            message: "마음에 든 공고부터 지원해 보세요. 지원한 뒤 공고 화면에서 '지원했어요'를 누르면 여기에 기록돼요.",
            href: applyHref,
            actionLabel: jobBookmarkCount > 0 ? "찜한 공고 보기" : "공고 찾아보기",
          };

  const topOccupation = latestResult ? splitRecommendationTracks(latestResult.recommendations).ready[0]?.occupationName : undefined;

  /* 희망 조건 줄의 결과 한 마디. 지역 · 근무형태 두 가지만 (급여 · 시기까지 붙이면 다시 빽빽해진다). */
  const desiredShort = [
    careerProfile?.region ? labelRegion(careerProfile.region) : undefined,
    careerProfile?.desiredWorkTypes?.[0] ? labelWorkType(careerProfile.desiredWorkTypes[0]) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    // /draft3 색 구성 (globals.css .draft3-theme): 옅은 회색 바탕에 흰 카드(모서리 20px, 테두리 · 그림자 없음).
    <div className="draft3-theme bg-baro-page">
      {/* 인사 · 다음 할 일은 흰 띠 위에(다른 화면의 흰 머리와 같은 결), 그 아래 단계 카드부터 회색 바탕. */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4.5 pt-10 pb-10 sm:pb-12 lg:px-8">
          <JourneySteps
            steps={steps}
            userName={userName}
            completedTitle={hiredCount > 0 ? "취업을 축하드려요!" : undefined}
            goal={goal}
          />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4.5 pt-10 pb-24 lg:px-8">

        {/*
          진행 막대와 같은 다섯 단계를 같은 순서로. 다 한 줄은 파랑으로 채운 동그라미라 몇 개 했는지 바로 센다.
          제목 옆에 "몇 개 했어요"는 두지 않는다 - 바로 위 진행 막대와 같은 말이다.
        */}
        <section aria-labelledby="mypage-ready">
          {/* 진행 막대는 제목 오른쪽에 - 막대가 세는 다섯 단계가 바로 아래 카드다. 좁은 화면은 제목 아래로 내려간다. */}
          <div
            className="mp-rise mb-3.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
            style={{ ["--mp-d" as string]: "160ms" }}
          >
            <h2 id="mypage-ready" className="text-title-3 font-bold text-slate-900">
              나의 취업 준비
            </h2>
            <JourneyProgress doneCount={steps.filter((s) => s.done).length} total={steps.length} />
          </div>
          <ul className="overflow-hidden rounded-card bg-white xl:grid xl:grid-cols-5 xl:gap-5 xl:overflow-visible xl:rounded-none xl:bg-transparent">
            <MenuRow
              step={1}
              href={hasCareerProfile ? "/mypage/profile" : "/onboarding/profile"}
              icon={UserRound}
              title="희망 조건"
              result={desiredShort || "수정하기"}
              description="희망 직종 · 지역을 알려 주세요"
              action="채우기"
              done={stepDone.profile}
              isNext={nextStepId === "profile"}
              doneAction="수정하기"
            />
            <MenuRow
              step={2}
              href={latestResult ? `/assessment/result/${latestResult.sessionId}` : "/assessment?start=1"}
              icon={Compass}
              title="직업진단"
              result={topOccupation ?? "결과 보기"}
              description="몇 가지 질문에 답하면 맞는 직업을 알려드려요"
              action="시작하기"
              done={stepDone.diagnosis}
              isNext={nextStepId === "diagnosis"}
              doneAction="결과 보기"
            />
            <MenuRow
              step={3}
              href={supportData.latestSessionId ? `/support/result/${supportData.latestSessionId}` : "/support?start=1"}
              icon={Gift}
              title="지원금 찾기"
              /* 찜한 지원금도 4단계 일자리처럼 결과 줄에 함께 센다 - 찜해 둔 것이 마이페이지 어디에도 안 보였다. */
              result={`${supportData.highCount > 0 ? supportData.highCount : supportData.matchCount}개 찾았어요${supportBookmarkCount > 0 ? ` · ${supportBookmarkCount}개 찜했어요` : ""}`}
              description="받을 수 있는 지원금을 찾아드려요"
              action="찾아보기"
              done={stepDone.support}
              isNext={nextStepId === "support"}
              doneAction="결과 보기"
            />
            {/* 맞춤 일자리를 둘러보는 것과 찜하는 것을 한 줄로. 찜했으면 찜 목록으로, 아니면 맞춤 공고 목록으로 간다. */}
            <MenuRow
              step={4}
              href={jobBookmarkCount > 0 ? "/mypage/bookmarks" : jobsHref}
              icon={Briefcase}
              title="일자리 찜하기"
              result={`${jobBookmarkCount}개 찜했어요`}
              description={jobsBasis.length > 0 ? `${jobsBasis.join(" · ")} 공고를 둘러보고 찜해 보세요` : "마음에 드는 공고를 찜해 보세요"}
              action="보러 가기"
              done={stepDone.jobs}
              isNext={nextStepId === "jobs"}
              doneAction="찜한 공고 보기"
            />
            <MenuRow
              step={5}
              href={resumeCount + coverLetterCount > 0 ? "/resume" : "/resume/new"}
              icon={FileText}
              title="이력서 · 자기소개서"
              result={`이력서 ${resumeCount}개 · 자소서 ${coverLetterCount}개`}
              description="이력서를 만들면 지원 준비가 끝나요"
              action="만들기"
              done={stepDone.documents}
              isNext={nextStepId === "documents"}
              doneAction="내 서류 보기"
            />
          </ul>
        </section>

        {/*
          회원이 공고 상세에서 "지원했어요"로 표시한 공고. 예전에는 다섯 단계를 다 마친 뒤 맨 위 카드에 건수만 보여
          어디에 지원했는지 돌아볼 곳이 없었다. 표시한 게 없으면 칸째 그리지 않는다.
          단계는 줄마다 세 칸 묶음으로 여기서 바로 바꾼다(공고 상세 오른쪽 카드와 같은 모양). 표시 취소는 공고 상세에서만.
          한 줄 전체를 링크로 두면 안에 단추를 넣을 수 없어, 공고로 가는 링크는 제목 쪽에만 둔다.
        */}
        {appliedJobs.length > 0 && (
          <section aria-labelledby="mypage-applied" className="mp-rise mt-11" style={{ ["--mp-d" as string]: "720ms" }}>
            {/* 안내 한 줄은 제목 바로 아래 둔다. 목록 밑에 두면 카드 안 글자(안쪽 여백)와 왼쪽 끝이 어긋나 보였다. */}
            <div className="flex items-baseline gap-2">
              <h2 id="mypage-applied" className="text-title-3 font-bold text-slate-900">
                지원한 공고
              </h2>
              <span className="text-title-3 font-bold text-baro-blue-600">{appliedJobs.length}</span>
            </div>
            <p className="mt-1 text-body-3 font-medium break-keep text-slate-600">
              면접이나 합격 소식이 있으면 여기서 바로 단계를 바꿔 주세요.
            </p>
            <ul className="mt-3.5 divide-y divide-slate-100 overflow-hidden rounded-card bg-white">
              {appliedJobs.map(({ application, job }) => (
                <li
                  key={application.id}
                  className="flex flex-col gap-3.5 px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6"
                >
                  {/* 화살표만 따로 두면 제목 길이에 따라 줄 가운데 떠 보여, 회사 줄 끝에 "공고 보기"로 붙인다. */}
                  <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-body-1 leading-snug font-semibold break-keep text-slate-900 sm:line-clamp-1">{job.title}</p>
                    <p className="mt-1.5 flex items-center gap-3 text-body-3 font-medium text-slate-600">
                      <span className="truncate">
                        {job.companyName} · {formatKstMonthDay(application.createdAt)} 지원
                      </span>
                      <span className="flex shrink-0 items-center font-semibold text-slate-700">
                        공고 보기
                        <ChevronRight aria-hidden className="size-4" />
                      </span>
                    </p>
                  </Link>
                  <div className="shrink-0 sm:w-80">
                    <JobApplicationStatusControl jobId={job.id} status={application.status} layout="block" showClear={false} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/*
          내 계정: 내 정보(이름 · 연락처 · 마케팅 소식 받기 · 탈퇴). 희망 조건(취업 프로필)과 나눠, 희망 조건을 채우기 전에도 늘 보인다.
          마케팅(광고성) 소식 받기 스위치와 탈퇴는 여기 두지 않고 내 정보 화면에만 둔다.
        */}
        <section aria-labelledby="mypage-account" className="mp-rise mt-11" style={{ ["--mp-d" as string]: "800ms" }}>
          <h2 id="mypage-account" className="mb-3.5 text-title-3 font-bold text-slate-900">
            내 계정
          </h2>
          <ul className="overflow-hidden rounded-card bg-white">
            <li>
              <Link href="/mypage/account" className="flex items-center gap-4 px-5 py-5 sm:px-7">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <UserRound className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-1 font-semibold text-slate-900">내 정보</span>
                  <span className="mt-0.5 block text-body-2 font-medium text-slate-600">이름 · 연락처 · 소식 받기</span>
                </span>
                <span className="hidden shrink-0 text-body-2 font-semibold text-slate-600 sm:inline">
                  {[profile.name, maskPhone(profile.phone)].filter(Boolean).join(" · ")}
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="mypage-alert" className="mp-rise mt-11" style={{ ["--mp-d" as string]: "880ms" }}>
          <h2 id="mypage-alert" className="mb-3.5 text-title-3 font-bold text-slate-900">
            알림
          </h2>
          <div>
            <JobAlertPanel
              settings={jobAlertSettings}
              phone={profile.phone ? formatPhone(profile.phone) : undefined}
              suggestedRegion={careerProfile?.region}
            >
              {/* 최근 받은 알림. 무엇을 보냈는지 회원도 알아야 "왜 이 공고가 왔지"가 풀린다. */}
              {myJobAlerts.length > 0 && (
                <div>
                  <p className="text-body-2 font-semibold text-slate-700">최근 받은 알림</p>
                  <ul className="mt-2 space-y-2">
                    {myJobAlerts.map((a) => (
                      <li key={`${a.sentAt}-${a.jobId ?? ""}`} className="flex items-start justify-between gap-3 text-body-3 font-medium">
                        <span className="min-w-0">
                          {a.jobId ? (
                            <Link href={`/jobs/${a.jobId}`} className="line-clamp-1 text-slate-800">
                              {a.jobTitle ?? "채용공고"}
                            </Link>
                          ) : (
                            <span className="line-clamp-1 text-slate-800">{a.jobTitle ?? "채용공고"}</span>
                          )}
                          {a.companyName && <span className="block text-slate-600">{a.companyName}</span>}
                        </span>
                        <span className="shrink-0 text-slate-600">
                          {a.sentAt.slice(5, 10).replace("-", ".")}
                          {a.status === "failed" ? " · 문자 대체" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </JobAlertPanel>
          </div>
        </section>
      </div>
    </div>
  );
}

/** "010-****-5678". 마이페이지 한 줄에 번호를 다 드러내지 않는다(고치는 화면에는 다 보인다). */
function maskPhone(phone: string | undefined): string | undefined {
  return phone ? formatPhone(phone).replace(/-\d{3,4}-/, "-****-") : undefined;
}
