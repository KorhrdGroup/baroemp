import type { Metadata } from "next";
import { AssessmentIntro } from "@/features/assessment/assessment-intro";
import { AssessmentAutoStart } from "@/features/assessment/assessment-auto-start";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { getAssessmentResultRepository } from "@/lib/repositories";
import { getOccupationShowcase } from "@/services/occupation-showcase.service";

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
    return (
      <div className="draft3-theme">
        <AssessmentAutoStart />
      </div>
    );
  }

  // 소개 화면은 비로그인도 볼 수 있다. 무엇을 하는 서비스인지 확인할 수 없으면
  // 로그인할 이유도 생기지 않는다. 시작 버튼을 누르는 순간 로그인으로 보낸다.
  const user = await getCurrentUser();

  // 이미 받은 진단이 있으면 소개 화면에서 지난 결과로 가는 길을 보여준다.
  const [latestResult, showcase] = await Promise.all([
    user ? getAssessmentResultRepository().findAll({ userId: user.id }).then((all) => all[0]) : undefined,
    // 소개 화면 "직업 모음". 읽기만 한다. 실패해도 소개 화면은 그대로 보이게.
    getOccupationShowcase().catch(() => null),
  ]);
  const now = new Date();
  const asOf = `${String(now.getFullYear()).slice(2)}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  // 이어하기 여부는 시작 버튼을 누르는 순간 팝업으로 묻는다 (StartAssessmentButton).
  // 화면 머리(PageHead)가 폭을 꽉 채우고 본문 폭은 소개 화면 안에서 잡으므로 여기서는 제한하지 않는다.
  // /draft3 색 구성 (globals.css .draft3-theme)
  return (
    <div className="draft3-theme">
      <AssessmentIntro
        isLoggedIn={Boolean(user)}
        latestResultSessionId={latestResult?.sessionId}
        showcase={showcase ? { data: showcase, asOf } : undefined}
      />
    </div>
  );
}
