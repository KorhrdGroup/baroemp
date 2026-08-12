import type { Metadata } from "next";
import { AssessmentIntro } from "@/features/assessment/assessment-intro";

export const metadata: Metadata = {
  title: "내게 맞는 직업 찾기 | 한평생 바로취업",
};

export default function AssessmentPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <AssessmentIntro />
    </div>
  );
}
