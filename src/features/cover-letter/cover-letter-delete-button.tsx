"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { deleteCoverLetterAction } from "./cover-letter-actions";

/**
 * 자기소개서 목록 카드의 삭제 버튼. 카드 전체가 Link라 클릭이 편집으로 새지 않게 전파를 막는다.
 *
 * 확인은 window.confirm 대신 앱 안 창으로 받는다. 네이티브 모달은 브라우저·임베드
 * 환경에 따라 뜨지 않고 취소로 처리되어, 눌러도 아무 일도 안 일어나 보였다.
 */
export function CoverLetterDeleteButton({ coverLetterId }: { coverLetterId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startDelete] = useTransition();

  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="자기소개서 삭제"
        className="text-slate-400 hover:bg-rose-50 hover:text-rose-500"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setConfirming(true);
        }}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>

      {/* 카드가 Link 안이라 창 안에서의 클릭도 편집으로 새지 않게 막는다. */}
      <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="이 자기소개서를 삭제할까요?"
          description="삭제하면 되돌릴 수 없습니다."
          pending={pending}
          onConfirm={() => {
            startDelete(async () => {
              await deleteCoverLetterAction(coverLetterId);
              setConfirming(false);
              router.refresh();
            });
          }}
        />
      </div>
    </>
  );
}
