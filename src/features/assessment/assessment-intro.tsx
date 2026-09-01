import Link from "next/link";
import { Briefcase, Clock, Sparkles } from "lucide-react";
import { IntroHero } from "@/components/common/intro-hero";
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
    <IntroHero
      icon={Briefcase}
      title="지금 나에게 맞는 일은 무엇일까요?"
      description={
        <>
          경력, 희망조건, 성향을 바탕으로{" "}
          <br className="hidden sm:block" />
          지금 도전하기 좋은 직업을 찾아드립니다.
        </>
      }
      infoItems={INFO_ITEMS}
      ctaHeadline="3~5분이면 진단이 끝납니다"
      ctaDescription="지금 시작하면 적합도와 준비도를 바로 확인할 수 있어요."
      cta={
        latestResultSessionId ? (
          /* 이미 결과가 있으면 두 버튼을 나란히 세운다. 카드 밖 작은 글줄로는 눈에 띄지 않았다. */
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/assessment/result/${latestResultSessionId}`}
              className="flex h-14 items-center justify-center gap-1.5 rounded-lg bg-brand-blue-50 px-6 text-body-2 font-bold text-brand-blue-700 transition-colors hover:bg-brand-blue-100/60"
            >
              지난 결과 보기
            </Link>
            <StartAssessmentButton isLoggedIn={isLoggedIn} />
          </div>
        ) : (
          <StartAssessmentButton isLoggedIn={isLoggedIn} />
        )
      }
      highlightTitle="이 검사로 알 수 있는 것"
      highlights={RESULT_ITEMS}
      note={
        <>
          검사 결과는 확정적인 취업 결과가 아닌 &quot;적합도&quot;와 &quot;준비도&quot;를 바탕으로 한 참고 정보입니다.
          검사 진행 중 입력하신 정보는 맞춤 추천을 위한 Career 정보로 활용되며, 마케팅 수신동의와는 별도로 관리됩니다.
        </>
      }
    />
  );
}
