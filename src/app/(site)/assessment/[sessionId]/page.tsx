import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { notFound, redirect } from "next/navigation";
import { loadAssessment } from "@/features/assessment-engine/question-loader";
import { selectQuestionsToAsk } from "@/features/assessment-engine/question-skipper";
import { AssessmentWizard } from "@/features/assessment/assessment-wizard";
import { getAssessmentSessionRepository, findCareerProfileByUserId } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "직업진단 진행 중 | 한평생 바로취업",
};

export default async function AssessmentSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  // 목록과 같은 이유로 로그인 필요. 로그인 후 이 화면으로 그대로 돌아온다.
  await requireUser(`/assessment/${sessionId}`);
  const session = await getAssessmentSessionRepository().findById(sessionId);
  if (!session) notFound();

  if (session.status === "completed") {
    redirect(`/assessment/result/${sessionId}`);
  }

  const loaded = await loadAssessment(session.assessmentId);
  if (!loaded) notFound();

  // 취업 프로필에 이미 있는 정보는 다시 묻지 않는다. 비회원 세션은 프로필이 없으므로 전 문항을 묻는다.
  const careerProfile = session.userId ? await findCareerProfileByUserId(session.userId) : null;
  const { asked, skipped } = selectQuestionsToAsk(loaded.orderedQuestions, careerProfile);
  // 문항이 하나도 안 남은 분류는 진행 바에서도 뺀다 (채워지지 않는 빈 칸이 생긴다).
  const askedSections = loaded.sections.filter((s) => asked.some((q) => q.section === s.key));

  return (
    <div>
      <AssessmentWizard
        sessionId={session.id}
        sections={askedSections}
        questions={asked}
        initialStep={session.currentStep}
        skippedCount={skipped.length}
      />
    </div>
  );
}
