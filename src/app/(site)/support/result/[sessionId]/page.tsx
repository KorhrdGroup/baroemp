import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { SupportMatchViewTracker } from "@/features/support/support-match-view-tracker";
import { SupportResultSections } from "@/features/support/support-card-grid";
import { SupportResultHero } from "@/features/support/support-result-hero";
import { SupportBookmarkedSection } from "@/features/support/support-bookmarked-section";
import { getSupportProgramRepository } from "@/lib/repositories";
import type { SupportEligibilityGrade, SupportProgram } from "@/types";
import { getSupportResultView } from "@/services/support-search.service";
import { getUserSupportBookmarkIdsAction } from "@/features/support/support-actions";

export const metadata: Metadata = {
  title: "지원금 진단 결과 | 한평생 바로취업",
};


export default async function SupportResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  // 목록과 같은 이유로 로그인 필요. 로그인 후 이 화면으로 그대로 돌아온다.
  const user = await requireUser(`/support/result/${sessionId}`);
  const [view, bookmarkedIds] = await Promise.all([
    getSupportResultView(sessionId),
    getUserSupportBookmarkIdsAction(),
  ]);
  if (!view) notFound();
  /*
    찜한 지원금을 결과 맨 위에 모은다. 마이페이지 3단계 카드가 이 화면으로 오므로, 찜해 둔 것을 따로 찾으러 가지 않게.
    이번 결과에 없는 것(지원금 목록 · 상세에서 찜한 것)도 있어 결과에서 고르지 않고 따로 불러온다.
    이번 결과에 있는 것은 같은 적합 등급 · 맞은 근거를 붙인다.
  */
  const bookmarkedPrograms = (
    await Promise.all(bookmarkedIds.map((id) => getSupportProgramRepository().findById(id)))
  ).filter((program): program is SupportProgram => Boolean(program));
  const matchById = new Map(view.categories.flatMap((c) => c.items).map((item) => [item.program.id, item.matchResult]));
  const likelyCount = view.gradeCounts.HIGH + view.gradeCounts.MEDIUM;
  const displayName = user.name ? `${user.name}님` : "회원님";

  const trackedItems = view.categories
    .flatMap((c) => c.items)
    .slice(0, 8)
    .map(({ program, matchResult }) => ({
      supportProgramId: program.id,
      matchScore: matchResult.score,
      eligibilityGrade: String(matchResult.grade ?? "CHECK_REQUIRED"),
    }));

  return (
    // 머리는 파랑 판(경기 잡아바 지원사업 소개 판 참고): 흰 바탕 위 위치 줄 → 파랑 판 → 회색 바탕 위 흰 카드 목록.
    <div className="draft3-theme bg-baro-page">
      <SupportMatchViewTracker items={trackedItems} />
      <SupportResultHero
        title={
          view.totalCount === 0
            ? "지금 조건에 맞는 지원제도를 찾지 못했어요."
            : likelyCount > 0
              ? `${displayName}에게 해당 가능성이 높은 지원제도 ${likelyCount}개를 찾았어요.`
              : `${displayName}, 조건 확인이 필요한 지원제도 ${view.totalCount}개를 찾았어요.`
        }
        tags={view.categories.filter((c) => c.items.length > 0).map((c) => c.label)}
        totalCount={view.totalCount}
        gradeCounts={view.gradeCounts}
      />

    <div className="mx-auto max-w-7xl px-4.5 pt-4 pb-20 lg:px-8">
      {/* 찜한 지원금은 결과 맨 위에. 아래 카드에서 찜하면 새로 고치지 않아도 바로 여기 붙는다. */}
      <SupportBookmarkedSection
        initial={bookmarkedPrograms.map((program) => {
          const match = matchById.get(program.id);
          return {
            program,
            grade: match ? ((match.grade ?? "CHECK_REQUIRED") as SupportEligibilityGrade) : undefined,
            reasons: match?.reasons,
          };
        })}
        pool={view.categories.flatMap((c) =>
          c.items.map(({ program, matchResult }) => ({
            program,
            grade: (matchResult.grade ?? "CHECK_REQUIRED") as SupportEligibilityGrade,
            reasons: matchResult.reasons,
          })),
        )}
      />
      {view.totalCount === 0 ? (
        <EmptyState
          className="mt-5 rounded-card border-0 bg-white"
          icon={Coins}
          title="조건에 맞는 지원제도를 찾지 못했어요"
          description="조건을 다시 입력하거나 잠시 후 다시 시도해주세요."
          action={
            <Button className="h-12 rounded-xl bg-atomic-blue-600 px-6 text-body-2 font-semibold text-white" asChild>
              <Link href="/support">다시 진단하기</Link>
            </Button>
          }
        />
      ) : (
        <SupportResultSections
          categories={view.categories}
          gradeCounts={view.gradeCounts}
          bookmarkedIds={bookmarkedIds}
        />
      )}
    </div>
    </div>
  );
}
