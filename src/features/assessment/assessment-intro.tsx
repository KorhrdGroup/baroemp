import { Briefcase, CheckCircle2, Clock, Gift, Sparkles } from "lucide-react";
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
  { icon: Gift, label: "무료" },
  { icon: Sparkles, label: "결과 즉시 확인" },
];

export function AssessmentIntro() {
  return (
    <div className="rounded-2xl border border-border bg-white p-8 sm:p-12">
      <span className="flex size-14 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue-600">
        <Briefcase className="size-7" />
      </span>

      <h1 className="mt-6 text-title-2 font-extrabold text-slate-900 sm:text-headline-3">
        지금 나에게 맞는 일은 무엇일까요?
      </h1>
      <p className="mt-3 max-w-xl text-body-2-reading text-slate-600">
        경력, 희망조건, 성향을 바탕으로
        <br className="hidden sm:block" />
        지금 도전하기 좋은 직업을 찾아드립니다.
      </p>

      <div className="mt-6 flex flex-wrap gap-4 text-label-1 font-semibold text-slate-500">
        {INFO_ITEMS.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <Icon className="size-4 text-brand-blue-600" />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-8">
        <StartAssessmentButton />
      </div>

      <div className="mt-10 rounded-xl bg-brand-blue-50/60 p-6">
        <p className="text-label-1 font-bold text-brand-blue-700">이 검사로 알 수 있는 것</p>
        <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {RESULT_ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-2 text-body-2 text-slate-700">
              <CheckCircle2 className="size-4 shrink-0 text-brand-blue-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-label-1 text-slate-400">
        검사 결과는 확정적인 취업 결과가 아닌 &quot;적합도&quot;와 &quot;준비도&quot;를 바탕으로 한 참고 정보입니다.
        검사 진행 중 입력하신 정보는 맞춤 추천을 위한 Career 정보로 활용되며, 마케팅 수신동의와는 별도로 관리됩니다.
      </p>
    </div>
  );
}
