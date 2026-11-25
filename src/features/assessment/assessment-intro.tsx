import Link from "next/link";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";
import { PageHead } from "@/components/layout/page-head";
import { StartAssessmentButton } from "./start-assessment-button";

const RESULT_ITEMS = [
  "나에게 맞는 직업",
  "직업별 적합도",
  "현재 준비도",
  "부족한 조건",
  "필요한 자격·교육",
  "추천 취업경로",
];

const INFO_ITEMS = [
  { icon: Clock, label: "약 3~5분" },
  { icon: Sparkles, label: "결과 즉시 확인" },
];

export function AssessmentIntro({
  isLoggedIn = true,
  latestResultSessionId,
}: {
  isLoggedIn?: boolean;
  /** 이미 받은 진단이 있으면 그 결과 세션. 다시 하라고만 권하면 지난 결과를 잃은 줄 안다. */
  latestResultSessionId?: string;
}) {
  return (
    // 세부 화면 공통 바탕: 흰 바탕 · 위치 줄과 큰 제목 · 얇은 선으로 나눈 상자. 그라데이션 배너는 쓰지 않는다.
    <div className="bg-white">
      <PageHead
        crumbs={[{ label: "직업진단" }]}
        title="지금 나에게 맞는 일은 무엇일까요?"
        description="경력, 희망조건, 성향을 바탕으로 지금 도전하기 좋은 직업을 찾아드립니다."
      />

      <div className="mx-auto max-w-6xl px-4.5 pb-16 lg:px-8">
        <div className="max-w-3xl">
          {/* 시작 상자: 소요 시간 → 안내 → 버튼. 화면에서 가장 먼저 눌러야 할 것이라 맨 위에 둔다. */}
          <section className="mt-8 flex flex-col gap-5 rounded-xl border border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {INFO_ITEMS.map(({ icon: InfoIcon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-body-3 font-semibold text-slate-700">
                    <InfoIcon className="size-4 text-atomic-blue-600" />
                    {label}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-body-1 font-bold text-slate-900">3~5분이면 진단이 끝납니다</p>
              <p className="mt-1 text-body-3 font-medium text-slate-600">지금 시작하면 적합도와 준비도를 바로 확인할 수 있어요.</p>
            </div>
            <div className="shrink-0">
              {latestResultSessionId ? (
                /* 이미 결과가 있으면 두 버튼을 나란히 세운다. 상자 밖 작은 글줄로는 눈에 띄지 않았다. */
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/assessment/result/${latestResultSessionId}`}
                    className="flex h-14 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-6 text-body-2 font-semibold text-slate-800"
                  >
                    지난 결과 보기
                  </Link>
                  <StartAssessmentButton isLoggedIn={isLoggedIn} />
                </div>
              ) : (
                <StartAssessmentButton isLoggedIn={isLoggedIn} />
              )}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-title-3 font-extrabold text-slate-900">이 검사로 알 수 있는 것</h2>
            {/* 항목이 여섯 개라 넓은 화면에서는 3열로 놓아 줄 수를 줄인다. */}
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {RESULT_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 rounded-xl border border-border px-5 py-4 text-body-2 font-medium text-slate-800"
                >
                  <CheckCircle2 className="size-5 shrink-0 text-atomic-blue-600" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-10 text-body-3 leading-relaxed font-medium text-slate-600">
            검사 결과는 확정적인 취업 결과가 아닌 &quot;적합도&quot;와 &quot;준비도&quot;를 바탕으로 한 참고 정보입니다.
            검사 진행 중 입력하신 정보는 맞춤 추천을 위한 Career 정보로 활용되며, 마케팅 수신동의와는 별도로 관리됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
