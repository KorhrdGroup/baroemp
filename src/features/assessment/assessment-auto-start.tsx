"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { startAssessmentSessionAction } from "./assessment-actions";

/**
 * /assessment?start=1 로 들어오면 소개 화면을 건너뛰고 바로 검사를 시작한다.
 * 마이페이지처럼 이미 무엇을 하려는지 아는 상태에서 들어오는 경로용이다.
 *
 * 세션 생성을 서버 렌더링 중에 하지 않고 클라이언트 effect로 하는 이유:
 * Next.js가 Link를 prefetch하면 서버 컴포넌트가 미리 실행되는데, 그때 세션이 생기면
 * 누르지도 않은 검사 세션이 쌓인다.
 */
export function AssessmentAutoStart() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // React StrictMode의 이중 실행으로 세션이 두 번 만들어지지 않게 막는다.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const anonymousId = getOrCreateAnonymousId();
        const { sessionId } = await startAssessmentSessionAction({ anonymousId: anonymousId || undefined });
        router.replace(`/assessment/${sessionId}`);
      } catch {
        setError("검사를 시작하지 못했어요. 다시 시도해주세요.");
      }
    })();
  }, [router]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 text-center">
      {error ? (
        <>
          <p className="text-label-1 text-rose-600">{error}</p>
          <Button
            className="mt-4 bg-brand-blue-400 hover:bg-brand-blue-600"
            onClick={() => router.replace("/assessment")}
          >
            소개 화면으로
          </Button>
        </>
      ) : (
        <>
          <Loader2 className="size-6 animate-spin text-brand-blue-400" />
          <p className="mt-4 text-label-1 text-slate-500">직업진단을 준비하고 있어요…</p>
        </>
      )}
    </div>
  );
}
