import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { SupportMatchViewTracker } from "@/features/support/support-match-view-tracker";
import { SupportResultSections } from "@/features/support/support-card-grid";
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
    <div className="min-h-screen bg-slate-50">
    <div className="mx-auto max-w-6xl px-4 py-10 pb-20 sm:px-6 lg:px-8">
      <SupportMatchViewTracker items={trackedItems} />

      <div className="mb-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">지원금 진단 결과</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">
          {view.totalCount === 0
            ? "현재 조건에 맞는 지원제도를 찾지 못했습니다."
            : likelyCount > 0
              ? `${displayName}에게 해당 가능성이 높은 지원제도 ${likelyCount}개를 찾았습니다.`
              : `${displayName}, 조건 확인이 필요한 지원제도 ${view.totalCount}개를 찾았습니다.`}
        </h1>
        <p className="mt-2 text-label-1 text-slate-400">
          입력하신 조건 기준의 참고 정보로, 최종 신청 가능 여부 확인은 각 운영기관에서 확인해야 합니다.
        </p>
      </div>

      {view.totalCount === 0 ? (
        <EmptyState
          icon={Coins}
          title="조건에 맞는 지원제도를 찾지 못했어요"
          description="조건을 다시 입력하거나 잠시 후 다시 시도해주세요."
          action={
            <Button className="bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
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
