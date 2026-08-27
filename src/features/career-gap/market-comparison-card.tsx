"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { BarChart3, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResumeMarketComparisonView } from "@/types";
import {
  trackCareerGapItemViewedAction,
  trackCareerGapRecommendationClickedAction,
} from "./career-gap-actions";

interface MarketComparisonCardProps {
  view: ResumeMarketComparisonView;
  source: "resume_review" | "cover_letter_review";
}

/**
 * 첨삭 결과 하단 "실제 채용시장 분석" 카드 (이력서/자소서 공용).
 * 모든 수치는 커리어갭 엔진의 결정론적 산출값이다 - AI 첨삭 결과와 무관 (스펙 49번).
 */
export function MarketComparisonCard({ view, source }: MarketComparisonCardProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    const top = view.items[0];
    if (view.state !== "READY" || !view.analysisId || !top) return;
    trackedRef.current = true;
    void trackCareerGapItemViewedAction({
      analysisId: view.analysisId,
      requirementId: top.requirementId,
      marketRate: top.marketRate,
      source,
    });
  }, [view, source]);

  if (view.state === "UNAVAILABLE") return null;

  if (view.state === "NEEDS_TARGET") {
    if (source === "resume_review") {
      return (
        <Card className="rounded-xl border-0 ring-1 ring-slate-200 bg-slate-50">
          <CardContent className="py-4 text-label-1 text-slate-600">
            <p>이 화면의 기본정보에서 희망직무를 입력하고 저장한 뒤 다시 AI 점검을 실행하면 채용시장 비교를 보여드려요.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="rounded-xl border-0 ring-1 ring-slate-200 bg-slate-50">
        <CardContent className="flex items-center justify-between gap-3 py-4 text-label-1 text-slate-600">
          <p>자소서에 지원 공고를 연결하거나 마이페이지에서 희망직무를 설정해 주세요.</p>
          <Link
            href="/mypage/profile"
            className="flex shrink-0 items-center gap-1 font-semibold text-brand-blue-700 hover:underline"
          >
            희망직무 설정하기 <ChevronRight className="size-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (view.items.length === 0) return null;

  return (
    <Card className="rounded-xl border-0 ring-1 ring-brand-blue-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-body-2">
          <BarChart3 className="size-4 text-brand-blue-500" />
          실제 채용시장 분석 결과
          {view.occupationName && <Badge variant="outline">{view.occupationName}</Badge>}
        </CardTitle>
        {typeof view.marketSampleSize === "number" && view.marketSampleSize > 0 && (
          <p className="text-caption-1 text-slate-400">최근 공고 {view.marketSampleSize}건 기준</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-label-1">
        {view.items.map((item) => (
          <div key={item.requirementId} className="space-y-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <p className="font-semibold text-slate-800">{item.requirementName}</p>
            <p className="text-slate-600">
              {item.showRate
                ? `이 조건을 요구하거나 우대하는 공고 ${item.marketRate}%`
                : "이 직무에서 자주 요구되는 조건입니다"}
            </p>
            {typeof item.projectedEligibleJobCount === "number" && (
              <p className="text-slate-600">
                충족 시 회원님 조건과 일치하는 공고{" "}
                <span className="font-semibold text-brand-blue-700">
                  {item.currentEligibleJobCount}건 → {item.projectedEligibleJobCount}건
                </span>
              </p>
            )}
            <Link
              href="/consulting"
              onClick={() => {
                if (!view.analysisId) return;
                void trackCareerGapRecommendationClickedAction({
                  analysisId: view.analysisId,
                  requirementId: item.requirementId,
                  contentId: item.recommendedContent?.contentId,
                  source,
                });
              }}
              className="inline-flex items-center gap-1 pt-1 font-semibold text-brand-blue-700 hover:underline"
            >
              {item.recommendedContent ? `${item.recommendedContent.title} 준비방법 확인` : "준비방법 확인"}
              <ChevronRight className="size-4" />
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
