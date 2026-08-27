"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCoverLetterAction } from "./cover-letter-actions";

/** 자기소개서 목록 카드의 삭제 버튼. 카드 전체가 Link라 클릭이 편집으로 새지 않게 전파를 막는다. */
export function CoverLetterDeleteButton({ coverLetterId }: { coverLetterId: string }) {
  const router = useRouter();
  const [pending, startDelete] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="자기소개서 삭제"
      className="text-slate-400 hover:bg-rose-50 hover:text-rose-500"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm("이 자기소개서를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.")) return;
        startDelete(async () => {
          await deleteCoverLetterAction(coverLetterId);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
