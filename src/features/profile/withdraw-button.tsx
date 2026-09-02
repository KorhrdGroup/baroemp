"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { withdrawAction } from "./withdraw-actions";

/**
 * 탈퇴하기.
 *
 * 되돌릴 수 없는 동작이라 한 번 더 묻는다. 무엇이 사라지는지 적어야 "탈퇴"가 무슨 뜻인지 알고 누른다.
 * 회색 글자 버튼으로 두어 저장하기 옆에서 잘못 눌리지 않게 한다.
 */
export function WithdrawButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleWithdraw() {
    setError(null);
    startTransition(async () => {
      const result = await withdrawAction();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-label-1 font-medium text-slate-400 underline underline-offset-4"
      >
        탈퇴하기
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>정말 탈퇴하시겠어요?</DialogTitle>
            <DialogDescription className="break-keep">
              계정과 함께 이력서·자기소개서, 찜한 일자리·지원제도, 직업진단·지원금 진단 결과가 모두 삭제됩니다.
              삭제한 정보는 되돌릴 수 없어요.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-label-1 text-red-600">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              돌아가기
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleWithdraw}
              disabled={pending}
            >
              {pending ? "처리 중..." : "탈퇴하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
