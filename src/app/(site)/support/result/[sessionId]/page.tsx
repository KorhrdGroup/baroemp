import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead } from "@/components/layout/page-head";
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
    // 세부 화면 공통 바탕: 위치 줄과 큰 제목. 진단 결과 문장을 화면 제목으로 쓴다.
    // /draft3 색 구성 (globals.css .draft3-theme): 옅은 하늘 머리 아래 회색 띠 위에 흰 카드.
    <div className="draft3-theme bg-white">
      <SupportMatchViewTracker items={trackedItems} />
      <PageHead icon="support"
        crumbs={[{ label: "지원금 찾기", href: "/support" }, { label: "진단 결과" }]}
        title={
          view.totalCount === 0
            ? "현재 조건에 맞는 지원제도를 찾지 못했습니다."
            : likelyCount > 0
              ? `${displayName}에게 해당 가능성이 높은 지원제도 ${likelyCount}개를 찾았습니다.`
              : `${displayName}, 조건 확인이 필요한 지원제도 ${view.totalCount}개를 찾았습니다.`
        }
        description="입력하신 조건 기준의 참고 정보로, 최종 신청 가능 여부 확인은 각 운영기관에서 확인해야 합니다."
      />

    <div className="bg-gov-surface">
    <div className="mx-auto max-w-6xl px-4.5 pt-4 pb-20 lg:px-8">
      {view.totalCount === 0 ? (
        <EmptyState
          className="mt-5 rounded-card border-0 bg-white"
          icon={Coins}
          title="조건에 맞는 지원제도를 찾지 못했어요"
          description="조건을 다시 입력하거나 잠시 후 다시 시도해주세요."
          action={
            <Button className="h-12 rounded-xl bg-atomic-blue-600 px-6 text-body-2 font-bold text-white" asChild>
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
    </div>
  );
}
