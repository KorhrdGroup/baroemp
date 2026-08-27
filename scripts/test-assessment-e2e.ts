/**
 * 실제 검사 플로우 E2E 검증 (일회성).
 * 실행: npx tsx scripts/test-assessment-e2e.ts
 * 세션 시작 → 27문항 실제 제출 → 결과 생성까지 앱 코드 그대로 실행해
 * "가르침형" 답변이 실제 결과 화면 데이터에서 교육 계열 직업으로 이어지는지 확인한다.
 */
import { readFileSync } from "node:fs";

// 앱 코드가 import 시점에 env를 읽으므로, import 전에 .env.local을 주입한다.
for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i).trim()] ??= line.slice(i + 1).trim();
}

async function main() {
  const { startAssessmentSession, submitAssessmentAnswer, completeAssessmentSession } = await import(
    "../src/features/assessment-engine/assessment-service"
  );

  const anonymousId = `e2e-test-${Math.floor(Math.random() * 100000)}`;
  const { session, assessment } = await startAssessmentSession({ anonymousId });
  console.log(`검사: ${assessment.title} / 문항 ${assessment.questions.length}개 / 세션 ${session.id}`);

  const questions = [...assessment.questions].sort((a, b) => a.orderIndex - b.orderIndex);

  // 가르침형 페르소나: 가르침 5점, 돌봄 4점, 손기술 1점, 교육의향 5점
  const scaleByDimension: Record<string, number> = {
    people_interaction: 4,
    care_orientation: 4,
    administrative_skill: 3,
    physical_activity: 3,
    stress_response: 4,
    teaching_orientation: 5,
    aesthetic_skill: 1,
    education_willingness: 5,
  };

  for (const q of questions) {
    let payload: { optionId?: string; optionIds?: string[]; rawValue?: unknown } | null = null;
    if (q.answerType === "SCALE") {
      payload = { rawValue: scaleByDimension[q.scoringDimension ?? ""] ?? 3 };
    } else if (q.answerType === "SINGLE" && q.options?.length) {
      // 교육/가르침 페르소나에 맞는 선택지를 우선 고르고, 없으면 두 번째 선택지
      const preferred = q.options.find((o) => /교육|바로 시작|가능하다|정규직|구직/.test(o.optionText));
      payload = { optionId: (preferred ?? q.options[Math.min(1, q.options.length - 1)]).id };
    } else if (q.answerType === "NUMBER") {
      payload = { rawValue: q.questionText.includes("경력단절") ? 0 : 8 };
    } else if (q.answerType === "REGION") {
      payload = { rawValue: { sido: "seoul" } };
    } else if (q.answerType === "SALARY_RANGE") {
      payload = { rawValue: { min: 2200, max: 2800 } };
    } else if (q.answerType === "QUALIFICATION_MULTI") {
      payload = null; // 자격증 없음 (선택 문항)
    } else if (q.options?.length) {
      payload = { optionId: q.options[0].id };
    }
    if (!payload && q.required) payload = { rawValue: 3 };
    if (payload) await submitAssessmentAnswer({ sessionId: session.id, questionId: q.id, ...payload });
  }

  const result = await completeAssessmentSession(session.id);
  console.log("\n[실제 결과 화면에 나갈 추천 직업]");
  result.recommendations.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}위 ${r.occupationName} — ${r.totalScore}점 (${r.grade})`);
    if (i === 0) r.reasons?.slice(0, 3).forEach((reason) => console.log(`      · ${reason}`));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
