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
  const nextStep = progressSteps.find((s) => s.id === nextStepId);
  const recommended = user ? (await getRecommendedJobsForUser(user.id, 1))[0] : undefined;

  const percent = Math.round((doneCount / progressSteps.length) * 100);
  // 연결선은 첫 원 중심(10%)에서 마지막 원 중심(90%)까지 80% 폭을 차지한다.
  const lineFill =
    doneCount > 1 ? ((doneCount - 1) / (progressSteps.length - 1)) * 80 : 0;

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
            {user && (
              <div className="mb-8">
                <div className="flex items-center justify-between text-label-1">
                  <span className="font-semibold text-slate-700">진행률</span>
                  <span className="font-bold text-brand-blue-600">{percent}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-atomic-mono-200">
                  <div className="h-full rounded-full bg-brand-blue-400" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )}

            <ol className="relative grid grid-cols-5 gap-2">
              {/* 원 5개 뒤로 이어지는 연결선. 첫 원과 마지막 원의 중심을 잇는다. */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-[10%] right-[10%] top-[18px] h-px bg-border sm:top-5"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute left-[10%] top-[18px] h-px bg-brand-blue-400 transition-[width] duration-300 sm:top-5"
                style={{ width: `${lineFill}%` }}
              />
              {progressSteps.map((step) => {
                const done = status[step.id];
                const isNext = step.id === nextStepId;
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
                            : isNext
                              ? "bg-white text-brand-blue-600 ring-2 ring-brand-blue-400"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200")
                        }
                      >
                        {done ? <Check className="size-4 sm:size-5" /> : step.step}
                      </Link>
                    </div>
                    <p
                      className={
                        "mt-2 text-label-1 font-semibold sm:text-body-2 " +
                        (done || isNext ? "text-slate-800" : "text-slate-400")
                      }
                    >
                      {step.title}
                    </p>
                    <p className="mt-0.5 hidden text-label-2 text-slate-400 sm:block">{step.description}</p>
                    {isNext && user && (
                      <span className="mt-1 text-label-2 font-semibold text-brand-blue-600">진행할 차례</span>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-label-1 text-slate-500">
                {!user
                  ? "진단부터 취업 준비 상황을 한 번에 관리하고 싶으신가요?"
                  : nextStep
                    ? `다음은 '${nextStep.title}' 단계예요. ${nextStep.description}`
                    : "모든 단계를 마쳤어요. 새로운 공고를 확인해보세요."}
              </p>
              <Button className="shrink-0 bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
                <Link href={nextStep?.href ?? "/jobs"}>
                  {!user ? "진단부터 시작하기" : nextStep ? `${nextStep.title} 이어하기` : "채용공고 보기"}
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
