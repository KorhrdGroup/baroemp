import type { Metadata } from "next";
import { AssessmentIntro } from "@/features/assessment/assessment-intro";
import { AssessmentAutoStart } from "@/features/assessment/assessment-auto-start";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "내게 맞는 직업 찾기 | 한평생 바로취업",
};

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  // 개인 정보를 입력받아 결과를 남기는 검사라 로그인해야 이용할 수 있다.
  // 소개 화면도 함께 막는다. 읽고 시작하려는 순간 다시 튕기면 더 나쁘다.
  await requireUser(start === "1" ? "/assessment?start=1" : "/assessment");

  // ?start=1: 이미 무엇을 하려는지 아는 경로(마이페이지 등)에서 소개 화면을 건너뛴다.
  if (start === "1") return <AssessmentAutoStart />;

  // 히어로가 화면 폭을 꽉 채우므로 페이지에서 폭을 제한하지 않는다.
  return <AssessmentIntro />;
}
