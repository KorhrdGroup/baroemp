import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/section-heading";
import { getCurrentUser } from "@/lib/auth/session";
import { getRecommendedJobsForUser } from "@/services/job-search.service";
import { progressSteps } from "./progress-steps.data";
import { getProgressSummary } from "./progress-status";
import { ProgressStepsCard } from "./progress-steps-card";

export async function ProgressStepsSection() {
  const user = await getCurrentUser();
  const { status, nextStepId } = await getProgressSummary(user?.id ?? null);
  const nextStep = progressSteps.find((s) => s.id === nextStepId);
  const recommended = user ? (await getRecommendedJobsForUser(user.id, 1))[0] : undefined;


  return (
    <section className="pb-24 pt-14">
      <div className="mx-auto max-w-7xl px-4.5 lg:px-8">
        {/*
          몇 단계를 마쳤는지는 아래 카드가 이미 보여준다. 여기서는 그 숫자를 반복하는 대신
          "그래서 지금 뭘 하면 되는지"를 말한다.
        */}
        <SectionHeading
          title="한눈에 보는 취업 준비 현황"
          description={
            !user
              ? "로그인하면 내가 어디까지 왔는지 이어서 볼 수 있어요."
              : nextStep
                ? `이제 ${nextStep.title} 단계를 진행할 차례예요.`
                : "준비 단계를 모두 마치셨어요. 새로 올라온 공고를 확인해보세요."
          }
          align="center"
        />

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
                {/* 패널 하단 액션. 텍스트 링크는 카드 안에서 눌 수 있는 곳으로 보이지 않아 테두리 버튼으로 둔다. */}
                <Button variant="outline" className="mt-4 w-full text-brand-blue-600 hover:bg-brand-blue-50" asChild>
                  <Link href={`/jobs/${recommended.id}`}>
                    자세히 보기
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
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
                <Button variant="outline" className="mt-4 w-full text-brand-blue-600 hover:bg-brand-blue-50" asChild>
                  <Link href={"/assessment"}>
                    진단 시작하기
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
