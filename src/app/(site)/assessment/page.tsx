import type { Metadata } from "next";
import { AssessmentIntro } from "@/features/assessment/assessment-intro";

export const metadata: Metadata = {
  title: "내게 맞는 직업 찾기 | 한평생 바로취업",
};

export default function AssessmentPage() {
  // 히어로가 화면 폭을 꽉 채우므로 페이지에서 폭을 제한하지 않는다.
  return <AssessmentIntro />;
}
