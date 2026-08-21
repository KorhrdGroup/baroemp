import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, Coins, GraduationCap, HeartHandshake, Landmark, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { SupportProgramCard } from "@/features/support/support-program-card";
import { SupportMatchViewTracker } from "@/features/support/support-match-view-tracker";
import { getSupportResultView } from "@/services/support-search.service";
import { SUPPORT_ELIGIBILITY_GRADE_LABELS } from "@/types";
import type { SupportEligibilityGrade } from "@/types";

export const metadata: Metadata = {
  title: "지원금 진단 결과 | 한평생 바로취업",
};

const SUMMARY_GRADES: SupportEligibilityGrade[] = ["HIGH", "MEDIUM", "CHECK_REQUIRED"];

/** 결과가 카테고리별로 이어져 흰 카드가 계속 나열되므로, 아이콘으로 섹션의 시작을 알아보게 한다. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  employment: Briefcase,
  training: GraduationCap,
  living: HeartHandshake,
  regional: MapPin,
  other: Landmark,
};

export default async function SupportResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  // 목록과 같은 이유로 로그인 필요. 로그인 후 이 화면으로 그대로 돌아온다.
  await requireUser(`/support/result/${sessionId}`);
  const view = await getSupportResultView(sessionId);
  if (!view) notFound();

  const trackedItems = view.categories
    .flatMap((c) => c.items)
    .slice(0, 8)
    .map(({ program, matchResult }) => ({
      supportProgramId: program.id,
      matchScore: matchResult.score,
      eligibilityGrade: String(matchResult.grade ?? "CHECK_REQUIRED"),
    }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SupportMatchViewTracker items={trackedItems} />

      <div className="mb-8">
        <p className="text-label-1 font-semibold text-brand-blue-600">지원금 진단 결과</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">
          {view.totalCount === 0
            ? "현재 조건에 맞는 지원제도를 찾지 못했습니다."
            : "현재 조건에서 확인해볼 만한 혜택을 찾았습니다."}
        </h1>
        <div className="mt-4 flex flex-wrap gap-3">
          {SUMMARY_GRADES.map((grade) => (
            <span
              key={grade}
              className="rounded-full bg-slate-100 px-4 py-2 text-label-1 font-semibold text-slate-600"
            >
              {SUPPORT_ELIGIBILITY_GRADE_LABELS[grade]} {view.gradeCounts[grade]}개
            </span>
          ))}
        </div>
        <p className="mt-4 text-label-1 text-slate-400">
          매칭 등급은 입력하신 정보를 기준으로 한 참고 정보이며, 최종 신청 가능 여부는 각 운영기관에서 확인해야
          합니다.
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
        <div className="space-y-12">
          {view.categories.map((group) => {
            const Icon = CATEGORY_ICONS[group.category] ?? Landmark;
            return (
            <section key={group.category}>
              {/* 아이콘 + 밑줄로 섹션의 시작을 분명히 한다. 제목만으로는 카드 사이에 묻힌다. */}
              <div className="mb-5 flex items-center gap-2.5 border-b border-border pb-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50 text-brand-blue-600">
                  <Icon className="size-4" />
                </span>
                <h2 className="text-body-1 font-bold text-slate-900">{group.label}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-label-2 font-semibold text-slate-500">
                  {group.items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {group.items.map(({ program, matchResult }) => (
                  <SupportProgramCard
                    key={program.id}
                    program={program}
                    grade={matchResult.grade as SupportEligibilityGrade}
                    score={matchResult.score}
                    reasons={matchResult.reasons}
                  />
                ))}
              </div>
            </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
