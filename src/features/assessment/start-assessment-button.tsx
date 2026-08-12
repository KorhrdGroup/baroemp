"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { startAssessmentSessionAction } from "./assessment-actions";

export function StartAssessmentButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
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
      className="h-14 w-full rounded-xl bg-brand-blue-500 px-8 text-base font-bold hover:bg-brand-blue-600 sm:w-auto"
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : <>무료 직업진단 시작하기 <ArrowRight className="size-5" /></>}
    </Button>
  );
}
