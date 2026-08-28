"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResumeSessionDialog } from "@/components/common/resume-session-dialog";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { getResumableAssessmentAction, startAssessmentSessionAction } from "./assessment-actions";

interface Resumable {
  sessionId: string;
  currentStep: number;
  totalSteps: number;
  updatedAt: string;
}

export function StartAssessmentButton({ isLoggedIn = true }: { isLoggedIn?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resumable, setResumable] = useState<Resumable | null>(null);

  /** 새 세션을 만들어 첫 문항으로 이동한다. */
  async function startNew() {
    setLoading(true);
    try {
      const anonymousId = getOrCreateAnonymousId();
      const { sessionId } = await startAssessmentSessionAction({ anonymousId: anonymousId || undefined });
      router.push(`/assessment/${sessionId}`);
    } catch {
      setLoading(false);
    }
  }

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
    // 하다 만 진단이 있으면 새로 시작하기 전에 물어본다.
    // 소개 화면에 안내만 띄우면 그냥 지나치고 시작 버튼을 눌러 이전 답변이 버려진다.
    try {
      const anonymousId = getOrCreateAnonymousId();
      const found = await getResumableAssessmentAction({ anonymousId: anonymousId || undefined });
      if (found) {
        setResumable(found);
        setLoading(false);
        return;
      }
    } catch {
      // 조회 실패는 진단 시작을 막지 않는다 - 새로 시작한다.
    }

    await startNew();
  }

  return (
    <>
      <Button
        size="lg"
        onClick={handleStart}
        disabled={loading}
        className="h-14 w-full rounded-lg bg-brand-blue-400 px-8 text-body-2 font-bold hover:bg-brand-blue-600 sm:w-auto"
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : <>직업진단 시작하기 <ArrowRight className="size-5" /></>}
      </Button>

      <ResumeSessionDialog
        open={Boolean(resumable)}
        onOpenChange={(open) => {
          if (!open) setResumable(null);
        }}
        progressLabel={resumable ? `${resumable.totalSteps}문항 중 ${resumable.currentStep}문항` : undefined}
        updatedAt={resumable?.updatedAt}
        busy={loading}
        onResume={() => {
          if (!resumable) return;
          setLoading(true);
          router.push(`/assessment/${resumable.sessionId}`);
        }}
        onRestart={() => {
          setResumable(null);
          void startNew();
        }}
      />
    </>
  );
}
