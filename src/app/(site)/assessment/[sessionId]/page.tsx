import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { loadAssessment } from "@/features/assessment-engine/question-loader";
import { AssessmentWizard } from "@/features/assessment/assessment-wizard";
import { getAssessmentSessionRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "직업진단 진행 중 | 한평생 바로취업",
};

export default async function AssessmentSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getAssessmentSessionRepository().findById(sessionId);
  if (!session) notFound();

  if (session.status === "completed") {
    redirect(`/assessment/result/${sessionId}`);
  }

  const loaded = await loadAssessment(session.assessmentId);
  if (!loaded) notFound();

  return (
    <div>
      <AssessmentWizard
        sessionId={session.id}
        sections={loaded.sections}
        questions={loaded.orderedQuestions}
        initialStep={session.currentStep}
      />
    </div>
  );
}
