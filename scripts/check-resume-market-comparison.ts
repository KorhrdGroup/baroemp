/**
 * resume-market-comparison.service 검증 스크립트 (mock 모드).
 * 타겟 결정 3단계 fallback과 카드 뷰모델 산출을 검증한다.
 *
 * 실행: DATA_SOURCE_MODE=mock npx tsx scripts/check-resume-market-comparison.ts
 */
import { getOccupationRepository } from "@/lib/repositories";
import { mockAdminUsers } from "@/mocks/users.mock";
import { getMarketComparisonForTarget } from "@/services/resume-market-comparison.service";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "mock") {
    console.error("DATA_SOURCE_MODE=mock 으로 실행하세요.");
    process.exit(1);
  }

  assert(mockAdminUsers.length > 0, "mock 사용자 존재");
  const userId = mockAdminUsers[0].id;

  const occupations = await getOccupationRepository().findAll();
  const occupation = occupations.find((o) => o.status === "published") ?? occupations[0];
  assert(occupation, "mock occupation 존재");

  // 1. 타겟 정보가 전혀 없으면 NEEDS_TARGET
  const none = await getMarketComparisonForTarget({ userId });
  assert(none.state === "NEEDS_TARGET", `타겟 없음 → NEEDS_TARGET (got ${none.state})`);
  assert(none.items.length === 0, "NEEDS_TARGET이면 items 비어있음");

  // 2. targetOccupationId 직접 지정 → READY
  const direct = await getMarketComparisonForTarget({ userId, targetOccupationId: occupation.id });
  assert(direct.state === "READY", `occupationId 지정 → READY (got ${direct.state})`);
  assert(direct.analysisId, "READY이면 analysisId 존재");
  assert(direct.items.length <= 3, `카드 항목 3개 이하 (got ${direct.items.length})`);
  for (const item of direct.items) {
    assert(item.marketRate >= 0 && item.marketRate <= 100, `marketRate 0~100 (${item.requirementName}: ${item.marketRate})`);
    assert(typeof item.showRate === "boolean", `showRate는 confidence 기반 boolean (${item.requirementName})`);
    assert(
      item.projectedEligibleJobCount === undefined || item.projectedEligibleJobCount >= item.currentEligibleJobCount,
      `시뮬레이션 결과는 현재 매칭 수 이상 (${item.requirementName})`,
    );
  }

  // 3. desiredJobTitle 이름 매칭 fallback → READY
  const byTitle = await getMarketComparisonForTarget({ userId, desiredJobTitle: occupation.name });
  assert(byTitle.state === "READY", `desiredJobTitle 매칭 → READY (got ${byTitle.state})`);

  // 4. 매칭 불가능한 직무명 → NEEDS_TARGET
  const noMatch = await getMarketComparisonForTarget({ userId, desiredJobTitle: "존재하지않는직무XYZ" });
  assert(noMatch.state === "NEEDS_TARGET", `매칭 실패 → NEEDS_TARGET (got ${noMatch.state})`);

  console.log("\n모든 검증 통과");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
