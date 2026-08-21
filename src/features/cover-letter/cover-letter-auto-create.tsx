"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCoverLetterAction } from "./cover-letter-actions";

/**
 * 양식 선택 Step을 없애고, 기본 양식으로 바로 만들어 편집 화면으로 보낸다.
 * 양식은 편집 화면 상단에서 바꿀 수 있다(문항이 교체되므로 그쪽에서 확인을 받는다).
 *
 * 서버 렌더링이 아니라 클라이언트 effect에서 만드는 이유는 resume-auto-create와 같다.
 * Link prefetch로 서버 컴포넌트가 미리 실행돼도 자기소개서가 생기지 않게 하기 위함이다.
 */
export function CoverLetterAutoCreate({
  templateId,
  title,
  resumeId,
  targetJobId,
  targetOccupationId,
}: {
  templateId: string;
  title?: string;
  resumeId?: string;
  targetJobId?: string;
  targetOccupationId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const detail = await createCoverLetterAction({
          templateId,
          title,
          resumeId,
          targetJobId,
          targetOccupationId,
        });
        // 처음 만든 직후에는 양식 선택기를 펼친 상태로 열어 고를 수 있게 한다.
        router.replace(`/cover-letter/${detail.coverLetter.id}/edit?new=1`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "자기소개서 생성에 실패했습니다.");
      }
    })();
  }, [router, templateId, title, resumeId, targetJobId, targetOccupationId]);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center">
        <p className="text-label-1 text-rose-600">{error}</p>
        <Button className="mt-4" onClick={() => router.push("/cover-letter")}>
          자기소개서 목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white p-16 text-center">
      <Loader2 className="size-6 animate-spin text-brand-blue-400" />
      <p className="mt-4 text-label-1 text-slate-500">자기소개서 문항을 준비하는 중이에요…</p>
    </div>
  );
}
