import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/section-heading";
import { progressSteps } from "./progress-steps.data";

export function ProgressStepsSection() {
  return (
    <section className="bg-brand-blue-50/50 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title="나의 취업 준비 현황 한눈에" align="center" />

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-border sm:p-8">
            <ol className="grid grid-cols-5 gap-2">
              {progressSteps.map((step, index) => (
                <li key={step.id} className="flex flex-col items-center text-center">
                  <div className="relative flex w-full items-center">
                    {index > 0 && <span className="absolute left-0 top-1/2 h-px w-full -translate-x-full bg-border" />}
                    <span
                      className={
                        "mx-auto flex size-9 items-center justify-center rounded-full text-sm font-bold sm:size-10 " +
                        (index === 0
                          ? "bg-brand-blue-500 text-white"
                          : "bg-slate-100 text-slate-400")
                      }
                    >
                      {step.step}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800 sm:text-base">{step.title}</p>
                  <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">{step.description}</p>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-slate-500">
                진단부터 취업 준비 상황을 한 번에 관리하고 싶으신가요?
              </p>
              <Button className="bg-brand-blue-500 hover:bg-brand-blue-600" asChild>
                <Link href="/assessment">
                  진단부터 시작하기
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-border">
            <p className="text-sm font-semibold text-slate-500">오늘의 추천</p>
            <div className="mt-3 rounded-xl bg-brand-blue-50 p-4">
              <p className="text-sm font-semibold text-brand-blue-700">
                김평생님, 이런 일자리 어떠세요?
              </p>
              <p className="mt-2 text-base font-bold text-slate-900">재가복지센터 사회복지사</p>
              <p className="mt-1 text-sm text-slate-500">직무경력 3년 · 사례관리 담당</p>
            </div>
            <Link
              href="/jobs"
              className="mt-4 text-sm font-semibold text-brand-blue-600 hover:underline"
            >
              자세히 보기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
