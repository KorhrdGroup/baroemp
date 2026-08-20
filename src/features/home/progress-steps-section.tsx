import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/section-heading";
import { getCurrentUser } from "@/lib/auth/session";
import { getRecommendedJobsForUser } from "@/services/job-search.service";
import { progressSteps } from "./progress-steps.data";
import { getProgressSummary } from "./progress-status";

export async function ProgressStepsSection() {
  const user = await getCurrentUser();
  const { status, doneCount, nextStepId } = await getProgressSummary(user?.id ?? null);
  // 순서 개념이 아니라 "아직 남은 단계 하나"를 골라 안내하는 용도다.
  const remainingStep = progressSteps.find((s) => s.id === nextStepId);
  const recommended = user ? (await getRecommendedJobsForUser(user.id, 1))[0] : undefined;


  return (
    <section className="bg-brand-blue-50/50 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="나의 취업 준비 현황 한눈에"
          description={
            user
              ? `${progressSteps.length}단계 중 ${doneCount}단계를 마쳤어요.`
              : "로그인하면 진행 중인 단계를 이어서 볼 수 있어요."
          }
          align="center"
        />

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl bg-white p-6 ring-1 ring-border sm:p-8">
            <ol className="relative grid grid-cols-5 gap-2">
              {/* 원들을 잇는 구조선. 단계는 순서와 무관하게 완료할 수 있으므로 채우지 않는다. */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-[10%] right-[10%] top-[18px] h-px bg-border sm:top-5"
              />
              {progressSteps.map((step) => {
                const done = status[step.id];
                return (
                  <li key={step.id} className="flex flex-col items-center text-center">
                    <div className="relative flex w-full items-center">
                      <Link
                        href={step.href}
                        aria-label={`${step.title} 단계로 이동`}
                        className={
                          "relative z-10 mx-auto flex size-9 items-center justify-center rounded-full text-label-1 font-bold transition-colors sm:size-10 " +
                          (done
                            ? "bg-brand-blue-400 text-white"
                            : "bg-slate-100 text-slate-400 hover:bg-brand-blue-50 hover:text-brand-blue-600")
                        }
                      >
                        {done ? <Check className="size-4 sm:size-5" /> : step.step}
                      </Link>
                    </div>
                    <p
                      className={
                        "mt-2 text-label-1 font-semibold sm:text-body-2 " +
                        (done ? "text-slate-800" : "text-slate-400")
                      }
                    >
                      {step.title}
                    </p>
                    <p className="mt-0.5 hidden text-label-2 text-slate-400 sm:block">{step.description}</p>
                    {done && (
                      <span className="mt-1 text-label-2 font-semibold text-brand-blue-600">완료</span>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-label-1 text-slate-500">
                {!user
                  ? "진단부터 취업 준비 상황을 한 번에 관리하고 싶으신가요?"
                  : remainingStep
                    ? `'${remainingStep.title}' 단계가 아직 남아 있어요. 원하는 단계부터 시작하셔도 됩니다.`
                    : "모든 단계를 마쳤어요. 새로운 공고를 확인해보세요."}
              </p>
              <Button className="shrink-0 bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                <Link href={remainingStep?.href ?? "/jobs"}>
                  {!user ? "진단부터 시작하기" : remainingStep ? `${remainingStep.title} 하러 가기` : "채용공고 보기"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-white p-6 ring-1 ring-border">
            <p className="text-label-1 font-semibold text-slate-500">오늘의 추천</p>
            {recommended ? (
              <>
                <div className="mt-3 rounded-xl bg-brand-blue-50 p-4">
                  <p className="text-label-1 font-semibold text-brand-blue-700">
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
                  <p className="text-label-1 font-semibold text-brand-blue-700">
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
