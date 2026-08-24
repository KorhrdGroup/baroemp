import type { Metadata } from "next";
import { AssessmentIntro } from "@/features/assessment/assessment-intro";
import { AssessmentAutoStart } from "@/features/assessment/assessment-auto-start";
import { getCurrentUser, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "내게 맞는 직업 찾기 | 한평생 바로취업",
};

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;

  // ?start=1: 이미 무엇을 하려는지 아는 경로(마이페이지 등)에서 소개 화면을 건너뛴다.
  // 검사는 개인 정보를 입력받고 결과를 남기므로 이 경로는 로그인해야 한다.
  //
  // 복귀 경로에서는 start 를 떼고 소개 화면으로 되돌린다. 로그인 하나 끝냈다고
  // 곧바로 문항이 뜨면 무엇을 시작한 건지 확인할 틈이 없다. 소개를 한 번 더 보고
  // 사용자가 직접 시작 버튼을 누르게 한다.
  if (start === "1") {
    await requireUser("/assessment");
    return <AssessmentAutoStart />;
  }

  // 소개 화면은 비로그인도 볼 수 있다. 무엇을 하는 서비스인지 확인할 수 없으면
  // 로그인할 이유도 생기지 않는다. 시작 버튼을 누르는 순간 로그인으로 보낸다.
  const user = await getCurrentUser();

  // 히어로가 화면 폭을 꽉 채우므로 페이지에서 폭을 제한하지 않는다.
  return <AssessmentIntro isLoggedIn={Boolean(user)} />;
}
