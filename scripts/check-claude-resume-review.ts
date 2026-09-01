/**
 * Claude 첨삭 Provider 연결 검증 스크립트.
 * 실제 API를 1~2회 호출하므로 소액 과금된다. 배포 전 연결 확인용.
 *
 * 실행: npx tsx --conditions react-server --env-file-if-exists=.env.local scripts/check-claude-resume-review.ts
 */
import { createClaudeAIResumeProvider } from "@/lib/ai/claude-ai-resume.provider";

async function main() {
  const provider = createClaudeAIResumeProvider();

  const review = await provider.reviewResume({
    resumeId: "test",
    summary: "",
    experiences: [
      { companyName: "행복요양원", jobTitle: "요양보호사", responsibilities: "어르신 12명 일상생활 지원, 식사·투약 보조" },
    ],
    educations: [{ schoolName: "서울여자상업고등학교" }],
    qualifications: [{ name: "요양보호사 1급" }],
    skills: ["기록 작성", "휠체어 이동 보조"],
    targetJobTitle: "주간보호센터 요양보호사",
  });
  console.log("[reviewResume] score:", review.score);
  console.log("  strengths:", review.strengths.length, "| improvements:", review.improvements.length);
  console.log("  첫 개선점:", review.improvements[0]?.comment?.slice(0, 80));
  console.log("  jobFit:", review.jobFitComment?.slice(0, 80));

  const rewrite = await provider.rewriteResumeSection({
    sectionLabel: "담당업무",
    originalText: "어르신들 밥 챙겨드리고 약도 챙겨드렸음",
    agentStyle: "CARE_WELFARE",
  });
  console.log("[rewriteSection]", rewrite.rewrittenText);
}

main().catch((error) => {
  console.error("실패:", error);
  process.exit(1);
});
