import Link from "next/link";
import { DiagnosisLanding, PreviewCard } from "@/components/layout/diagnosis-landing";
import { StartAssessmentButton } from "./start-assessment-button";

const STEPS = [
  { title: "경력·희망 조건 고르기", desc: "해 온 일과 원하는 지역·급여·근무형태를 골라요." },
  { title: "성향 문항에 답하기", desc: "어떤 일이 편한지 쉬운 질문 몇 개에 답해요." },
  { title: "맞는 직업 확인하기", desc: "적합도와 준비도를 바로 보여드려요." },
];

const ITEMS = [
  { icon: "match", title: "나에게 맞는 직업", desc: "경력과 성향에 맞는 직업을 골라 드려요." },
  { icon: "fit", title: "직업별 적합도", desc: "직업마다 얼마나 잘 맞는지 점수로 보여드려요." },
  { icon: "ready", title: "현재 준비도", desc: "지금 바로 지원할 수 있는지 알려드려요." },
  { icon: "gap", title: "부족한 조건", desc: "지원 전에 채워야 할 것을 짚어 드려요." },
  { icon: "cert", title: "필요한 자격·교육", desc: "따면 길이 열리는 자격과 과정을 알려드려요." },
  { icon: "route", title: "추천 취업경로", desc: "공고 · 이력서 · 상담으로 바로 이어 드려요." },
];

/* 결과 예시 카드의 직업 세 줄. 실제 결과가 아닌 보기다(카드 맨 위에 "결과 예시"로 밝힌다). */
const SAMPLE = [
  { name: "요양보호사", fit: 92, ready: "바로 지원 가능" },
  { name: "시설 경비원", fit: 85, ready: "바로 지원 가능" },
  { name: "조리 보조원", fit: 78, ready: "자격 준비 필요" },
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
    <DiagnosisLanding
      crumbs={[{ label: "직업진단" }]}
      badges={["무료", "약 3~5분", "결과 바로 확인"]}
      title={
        <>
          지금 나에게 맞는 일,
          <br />
          <span className="text-atomic-blue-600">3분이면</span> 찾을 수 있어요
        </>
      }
      description="경력, 희망조건, 성향을 바탕으로 지금 도전하기 좋은 직업과 준비할 것을 알려드립니다."
      actions={
        /* 이미 결과가 있으면 두 단추를 나란히 세운다. 작은 글줄로는 눈에 띄지 않았다. */
        <div className="flex flex-col gap-2 sm:flex-row">
          <StartAssessmentButton isLoggedIn={isLoggedIn} />
          {latestResultSessionId && (
            <Link
              href={`/assessment/result/${latestResultSessionId}`}
              className="flex h-14 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-body-2 font-semibold text-slate-800"
            >
              지난 결과 보기
            </Link>
          )}
        </div>
      }
      preview={
        <PreviewCard label="결과 예시" title="회원님께 잘 맞는 직업">
          <ul className="flex flex-col gap-4">
            {SAMPLE.map((s, i) => (
              <li key={s.name}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-body-2 font-semibold text-slate-900">
                    <span className="flex size-6 items-center justify-center rounded-full bg-brand-blue-50 text-caption-1 font-semibold text-atomic-blue-600">{i + 1}</span>
                    {s.name}
                  </span>
                  <span className="text-body-2 font-bold text-atomic-blue-600">{s.fit}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-blue-400" style={{ width: `${s.fit}%` }} />
                </div>
                <p className={`mt-1.5 text-caption-1 font-semibold ${s.ready === "바로 지원 가능" ? "text-emerald-700" : "text-amber-700"}`}>{s.ready}</p>
              </li>
            ))}
          </ul>
        </PreviewCard>
      }
      steps={STEPS}
      itemsTitle="이 검사로 알 수 있는 것"
      items={ITEMS}
      note={
        <>
          검사 결과는 확정적인 취업 결과가 아닌 &quot;적합도&quot;와 &quot;준비도&quot;를 바탕으로 한 참고 정보입니다.
          검사 진행 중 입력하신 정보는 맞춤 추천을 위한 Career 정보로 활용되며, 마케팅 수신동의와는 별도로 관리됩니다.
        </>
      }
    />
  );
}
