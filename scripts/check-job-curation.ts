/**
 * job-curation.service 검증 스크립트 (mock 모드).
 * 실행: DATA_SOURCE_MODE=mock npx tsx scripts/check-job-curation.ts
 */
import { listAdminUsersPaged } from "@/services/admin-user-list.service";
import { getJobCuration } from "@/services/job-curation.service";

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
  const users = await listAdminUsersPaged({ pageSize: 1 });
  const userId = users.items[0]?.id;
  assert(userId, "mock 사용자 존재");

  const newTab = await getJobCuration(userId, "new");
  assert(newTab.state === "READY" || newTab.state === "EMPTY", `신규 탭 상태 (got ${newTab.state})`);
  assert(newTab.items.length <= 8, "신규 탭 8건 이하");

  const closing = await getJobCuration(userId, "closing_soon");
  for (const item of closing.items) {
    assert(item.job.applyDeadline, `마감임박 탭은 마감일 있는 공고만 (${item.job.title})`);
  }

  const matched = await getJobCuration(userId, "matched");
  assert(["READY", "EMPTY", "NEEDS_PROFILE"].includes(matched.state), `맞춤 탭 상태 (got ${matched.state})`);
  if (matched.state === "READY") {
    const scores = matched.items.map((i) => i.matchScore ?? 0);
    assert(
      scores.every((s, i) => i === 0 || s <= scores[i - 1]),
      "맞춤 탭 점수 내림차순",
    );
  }

  const ready = await getJobCuration(userId, "ready_to_apply");
  assert(["READY", "EMPTY", "NEEDS_PROFILE"].includes(ready.state), `지원가능 탭 상태 (got ${ready.state})`);

  const unlockable = await getJobCuration(userId, "unlockable");
  assert(
    ["READY", "EMPTY", "NEEDS_ANALYSIS", "NEEDS_PROFILE"].includes(unlockable.state),
    `자격 탭 상태 (got ${unlockable.state})`,
  );
  if (unlockable.state === "READY") {
    assert(unlockable.items.every((i) => i.unlockRequirementName), "자격 탭 항목에 자격명 존재");
  }

  console.log("\n모든 검증 통과");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
