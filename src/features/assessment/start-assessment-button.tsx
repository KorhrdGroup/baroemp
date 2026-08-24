"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { startAssessmentSessionAction } from "./assessment-actions";

export function StartAssessmentButton({ isLoggedIn = true }: { isLoggedIn?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    // 소개 화면은 비로그인도 볼 수 있다. 진단은 결과를 계정에 남기므로
    // 시작하는 시점에 로그인으로 보내고, 끝나면 곧바로 시작 지점으로 돌아온다.
    if (!isLoggedIn) {
      // 로그인 후에는 소개 화면으로 되돌린다. start=1 을 실어 보내면 로그인만
      // 끝냈을 뿐인데 곧바로 문항이 떠서 무엇을 시작한 건지 확인할 틈이 없다.
      router.push(`/login?next=${encodeURIComponent("/assessment")}`);
      return;
    }
    setLoading(true);
    try {
      const anonymousId = getOrCreateAnonymousId();
      const { sessionId } = await startAssessmentSessionAction({ anonymousId: anonymousId || undefined });
      router.push(`/assessment/${sessionId}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button
      size="lg"
      onClick={handleStart}
      disabled={loading}
      className="h-14 w-full rounded-lg bg-brand-blue-400 px-8 text-body-2 font-bold hover:bg-brand-blue-600 sm:w-auto"
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : <>무료 직업진단 시작하기 <ArrowRight className="size-5" /></>}
    </Button>
  );
}
