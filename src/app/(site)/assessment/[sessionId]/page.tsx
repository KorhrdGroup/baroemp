import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { notFound, redirect } from "next/navigation";
import { loadAssessment } from "@/features/assessment-engine/question-loader";
import { buildPrefilledAnswers } from "@/features/assessment/answer-prefill";
import { AssessmentWizard } from "@/features/assessment/assessment-wizard";
import {
  getAssessmentSessionRepository,
  getUserQualificationRepository,
  findCareerProfileByUserId,
} from "@/lib/repositories";

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

  // 취업 프로필에 이미 있는 정보는 건너뛰지 않고 채워진 상태로 보여준다. 확인·수정이 그 자리에서 된다.
  const careerProfile = session.userId ? await findCareerProfileByUserId(session.userId) : null;
  const heldQualificationNames = session.userId
    ? (await getUserQualificationRepository().findByUserId(session.userId)).map((q) => q.name)
    : [];
  const initialAnswers = buildPrefilledAnswers(loaded.orderedQuestions, careerProfile, heldQualificationNames);

  return (
    <div>
      <AssessmentWizard
        sessionId={session.id}
        sections={loaded.sections}
        questions={loaded.orderedQuestions}
        initialStep={session.currentStep}
        initialAnswers={initialAnswers}
      />
    </div>
  );
}
