import Link from "next/link";
import { SectionHeading } from "@/components/common/section-heading";
import { getCurrentUser } from "@/lib/auth/session";
import { getRecommendedJobsForUser } from "@/services/job-search.service";
import { progressSteps } from "./progress-steps.data";
import { getProgressSummary } from "./progress-status";
import { ProgressStepsCard } from "./progress-steps-card";

export async function ProgressStepsSection() {
  const user = await getCurrentUser();
  const { status, nextStepId } = await getProgressSummary(user?.id ?? null);
  const recommended = user ? (await getRecommendedJobsForUser(user.id, 1))[0] : undefined;


  return (
    <section className="pb-24 pt-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 진행 상황은 바로 아래 카드가 단계별로 보여주므로 제목 아래 설명은 두지 않는다. */}
        <SectionHeading title="한눈에 보는 취업 준비 현황" align="center" />

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          {/* 순서 개념이 아니라 "아직 남은 단계 하나"를 골라 처음 안내로 띄운다. */}
          <ProgressStepsCard
            steps={progressSteps}
            status={status}
            isLoggedIn={Boolean(user)}
            defaultStepId={nextStepId}
          />

          <div className="flex flex-col rounded-xl bg-white p-6 ring-1 ring-border">
            <p className="text-label-1 font-semibold text-slate-500">오늘의 추천</p>
            {recommended ? (
              <>
                <div className="mt-3 rounded-xl bg-brand-blue-50 p-4">
                  <p className="text-label-1 font-semibold text-brand-blue-600">
                    {user?.name ?? "회원"}님, 이런 일자리 어떠세요?
                  </p>
                  <p className="mt-2 text-body-2 font-bold text-slate-900">{recommended.title}</p>
                  <p className="mt-1 text-label-1 text-slate-500">
                    {recommended.companyName}
                    {recommended.match && ` · 적합도 ${recommended.match.score}점`}
                  </p>
                </div>
                <Link
                  href={`/jobs/${recommended.id}`}
                  className="mt-4 text-label-1 font-semibold text-brand-blue-600 hover:underline"
                >
                  자세히 보기
                </Link>
              </>
            ) : (
              <>
                <div className="mt-3 rounded-xl bg-brand-blue-50 p-4">
                  <p className="text-label-1 font-semibold text-brand-blue-600">
                    아직 추천할 일자리가 없어요
                  </p>
                  <p className="mt-2 text-label-1 leading-relaxed text-slate-500">
                    직업진단을 마치면 조건에 맞는 공고를 골라서 보여드려요.
                  </p>
                </div>
                <Link
                  href="/assessment"
                  className="mt-4 text-label-1 font-semibold text-brand-blue-600 hover:underline"
                >
                  진단 시작하기
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
