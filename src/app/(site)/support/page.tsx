import type { Metadata } from "next";
import { SupportFlow } from "@/features/support/support-flow";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { getSupportAssessmentSessionRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "지원금 찾기 | 한평생 바로취업",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;

  // ?start=1 은 곧바로 진단을 시작하는 경로라 로그인해야 한다.
  // 복귀 경로에서는 start 를 떼고 소개 화면으로 되돌린다. 로그인 직후 바로 문항이
  // 뜨는 대신, 소개를 확인하고 사용자가 직접 시작 버튼을 누르게 한다.
  if (start === "1") await requireUser("/support");

  // 소개 화면은 비로그인도 볼 수 있다. 시작하는 순간 로그인으로 보낸다.
  const user = await getCurrentUser();

  // 이미 받은 진단이 있으면 소개 화면에서 지난 결과로 가는 길을 보여준다.
  const latestSession = user
    ? (await getSupportAssessmentSessionRepository().findAll({ userId: user.id, status: "completed" }))[0]
    : undefined;

  return (
    <div>
      {/* ?start=1: 이미 무엇을 하려는지 아는 경로(마이페이지 등)에서 소개 화면을 건너뛴다. */}
      <SupportFlow autoStart={start === "1"} isLoggedIn={Boolean(user)} latestResultSessionId={latestSession?.id} />
    </div>
  );
}
