"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createResumeAction } from "./resume-actions";

/**
 * 양식 선택 Step을 없애고, 기본 양식으로 바로 만들어 편집 화면으로 보낸다.
 * 양식은 편집 화면 상단에서 언제든 바꿀 수 있다.
 *
 * 생성을 서버 렌더링 중에 하지 않고 클라이언트 effect로 하는 이유:
 * Next.js가 Link를 prefetch하면 서버 컴포넌트가 미리 실행되는데,
 * 그때 이력서가 생성되면 사용자가 누르지도 않은 이력서가 쌓인다.
 */
export function ResumeAutoCreate({
  templateId,
  title,
  targetJobId,
  targetOccupationId,
}: {
  templateId: string;
  title?: string;
  targetJobId?: string;
  targetOccupationId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // React 18 StrictMode의 이중 실행으로 이력서가 두 번 만들어지지 않게 막는다.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const detail = await createResumeAction({ templateId, title, targetJobId, targetOccupationId });
        router.replace(`/resume/${detail.resume.id}/edit`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "이력서 생성에 실패했습니다.");
      }
    })();
  }, [router, templateId, title, targetJobId, targetOccupationId]);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center">
        <p className="text-label-1 text-rose-600">{error}</p>
        <Button className="mt-4" onClick={() => router.push("/resume")}>
          이력서 목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white p-16 text-center">
      <Loader2 className="size-6 animate-spin text-brand-blue-400" />
      <p className="mt-4 text-label-1 text-slate-500">이력서를 만들고 내 정보를 불러오는 중이에요…</p>
    </div>
  );
}
