import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, ChevronRight, Compass, FileText, Gift, UserRound, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { labelJobCategory, labelRegion, labelWorkType } from "@/lib/labels";
import {
  getJobApplicationRepository,
  getMatchResultRepository,
  getSupportAssessmentSessionRepository,
} from "@/lib/repositories";
import { getUserJobBookmarkIdsAction } from "@/features/jobs/job-actions";
import { splitRecommendationTracks } from "@/features/assessment/recommendation-tracks";
import { JourneySteps, type JourneyStep } from "@/features/mypage/journey-steps";
import { JobAlertPanel } from "@/features/mypage/job-alert-panel";
import { getMyPageDetail } from "@/services/user-crm.service";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/utils/phone";
import type { JobApplication } from "@/types";
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
}: {
  /** 넓은 화면 카드 위에 보이는 단계 번호. */
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
}) {
  return (
    <li className="border-t border-slate-100 first:border-t-0 xl:border-t-0">
      <Link
        href={href}
        className={cn(
          "flex items-center gap-4 px-5 py-6 sm:px-7 xl:h-full xl:flex-col xl:items-stretch xl:gap-0 xl:rounded-card xl:p-6",
          isNext ? "bg-baro-blue-50" : "xl:bg-white",
        )}
      >
        <span className="flex shrink-0 items-center justify-between">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full",
              done ? "bg-baro-blue text-white" : isNext ? "bg-white text-baro-blue" : "bg-slate-100 text-slate-500",
            )}
          >
            <Icon className="size-5" />
          </span>
          <span
            aria-hidden
            /* 파랑은 다 한 동그라미 · 다음 할 카드 · "지금 하기"에만 쓴다. 단계 표시까지 파랑이면 화면이 파랗게 덮인다. */
            className="hidden text-body-3 font-semibold text-slate-600 xl:inline"
          >
            {step}단계{done && " · 완료"}
          </span>
        </span>
        <span className="min-w-0 flex-1 xl:mt-4 xl:flex-none">
          <span className="block text-body-1 font-bold break-keep text-slate-900">
            {title}
            <span className="sr-only">{done ? " (완료)" : isNext ? " (다음에 할 일)" : ""}</span>
          </span>
          {done ? (
            <span className="mt-0.5 block truncate text-body-2 font-medium text-slate-600 sm:hidden xl:mt-1.5 xl:block xl:font-semibold xl:break-keep xl:whitespace-normal">
              {result}
            </span>
          ) : (
            <span className="mt-0.5 block text-body-2 font-medium break-keep text-slate-600 xl:mt-1.5">{description}</span>
          )}
        </span>
        <span
          className={cn(
            "hidden shrink-0 text-body-2 sm:inline xl:hidden",
            done ? "font-semibold text-slate-600" : isNext ? "font-bold text-baro-blue-600" : "font-bold text-slate-600",
          )}
        >
          {done ? result : isNext ? "지금 하기" : action}
        </span>
        {/* 넓은 화면 카드는 맨 아래에 할 일 글자를 둔다. 다 한 카드는 결과가 이미 위에 있어 비운다. */}
        {!done && (
          <span
            aria-hidden
            className={cn(
              "mt-auto hidden items-center gap-1 pt-4 text-body-2 font-bold xl:flex",
              isNext ? "text-baro-blue-600" : "text-slate-600",
            )}
          >
            {isNext ? "지금 하기" : action}
            <ChevronRight className="size-4" />
          </span>
        )}
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
  const [jobBookmarkIds, supportData, applications] = await Promise.all([
    getUserJobBookmarkIdsAction().catch(() => [] as string[]),
    loadMyPageSupportData(user.id),
    // 회원이 직접 표시한 지원·면접·취업. 외부 지원이라 다섯 단계를 마친 뒤 맨 위 카드의 근거가 된다.
    getJobApplicationRepository()
      .findAllByUser(user.id)
      .catch(() => [] as JobApplication[]),
  ]);
  const jobBookmarkCount = jobBookmarkIds.length;

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
  const applyHref = jobBookmarkCount > 0 ? "/mypage/bookmarks#jobs" : jobsHref;
  /* 다섯 단계를 다 마친 뒤 맨 위 카드. 취업까지 표시했으면 카드 없이 제목이 축하한다. */
  const goal =
    hiredCount > 0
      ? undefined
      : applications.length > 0
        ? {
            label: "지원 현황",
            title: "좋은 소식을 기다릴게요",
            message: `지원 ${applications.length}건${interviewCount > 0 ? ` · 면접 ${interviewCount}회` : ""}. 면접이나 합격 소식이 있으면 공고 화면에서 표시해 주세요.`,
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
      <div className="mx-auto max-w-7xl px-4.5 pt-10 pb-24 lg:px-8">
        <JourneySteps
          steps={steps}
          userName={userName}
          completedTitle={hiredCount > 0 ? "취업을 축하드려요!" : undefined}
          goal={goal}
        />

        {/*
          진행 막대와 같은 다섯 단계를 같은 순서로. 다 한 줄은 파랑으로 채운 동그라미라 몇 개 했는지 바로 센다.
          제목 옆에 "몇 개 했어요"는 두지 않는다 - 바로 위 진행 막대와 같은 말이다.
        */}
        <section aria-labelledby="mypage-ready" className="mt-11">
          <h2 id="mypage-ready" className="mb-3.5 text-title-3 font-extrabold text-slate-900">
            나의 취업 준비
          </h2>
          <ul className="overflow-hidden rounded-card bg-white xl:grid xl:grid-cols-5 xl:gap-4 xl:overflow-visible xl:rounded-none xl:bg-transparent">
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
            />
            <MenuRow
              step={3}
              href={supportData.latestSessionId ? `/support/result/${supportData.latestSessionId}` : "/support?start=1"}
              icon={Gift}
              title="지원금 찾기"
              result={`${supportData.highCount > 0 ? supportData.highCount : supportData.matchCount}개 찾았어요`}
              description="받을 수 있는 지원금을 찾아드려요"
              action="찾아보기"
              done={stepDone.support}
              isNext={nextStepId === "support"}
            />
            {/* 맞춤 일자리를 둘러보는 것과 찜하는 것을 한 줄로. 찜했으면 찜 목록으로, 아니면 맞춤 공고 목록으로 간다. */}
            <MenuRow
              step={4}
              href={jobBookmarkCount > 0 ? "/mypage/bookmarks#jobs" : jobsHref}
              icon={Briefcase}
              title="일자리 찜하기"
              result={`${jobBookmarkCount}개 찜했어요`}
              description={jobsBasis.length > 0 ? `${jobsBasis.join(" · ")} 공고를 둘러보고 찜해 보세요` : "마음에 드는 공고를 찜해 보세요"}
              action="보러 가기"
              done={stepDone.jobs}
              isNext={nextStepId === "jobs"}
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
            />
          </ul>
        </section>

        <section aria-labelledby="mypage-alert" className="mt-11">
          <h2 id="mypage-alert" className="mb-3.5 text-title-3 font-extrabold text-slate-900">
            알림
          </h2>
          <div>
            <JobAlertPanel settings={jobAlertSettings} phone={profile.phone ? formatPhone(profile.phone) : undefined}>
              {/* 최근 받은 알림. 무엇을 보냈는지 회원도 알아야 "왜 이 공고가 왔지"가 풀린다. */}
              {myJobAlerts.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-body-2 font-bold text-slate-700">최근 받은 알림</p>
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
