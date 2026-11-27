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
import { cn } from "@/lib/utils";
import { withdrawAction } from "./withdraw-actions";

/**
 * 떠나는 이유. 고르는 값이라 자유 입력만 두지 않는다 - 적는 수고 때문에 대부분 빈칸으로 나간다.
 * 뜻이 갈리는 것들만 짧게 늘어놓고, 나머지는 직접 적게 한다.
 */
const REASONS = [
  "원하는 공고가 없어요",
  "알림이 너무 자주 와요",
  "쓰기가 어려워요",
  "개인정보가 걱정돼요",
  "취업에 성공했어요",
  "기타",
] as const;

/**
 * 탈퇴하기.
 *
 * 되돌릴 수 없는 동작이라 확인 창을 한 번 거친다. 무엇이 사라지는지 적어야
 * "탈퇴"가 무슨 뜻인지 알고 누른다. 떠나는 이유도 이 창에서 함께 묻는다 -
 * 창을 두 번 띄우면 두 번째에서 대부분 그냥 닫는다.
 */
export function WithdrawButton() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleWithdraw() {
    setError(null);
    startTransition(async () => {
      const result = await withdrawAction({ reason: reason ?? undefined, detail: detail.trim() || undefined });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative tap-44 text-body-3 font-medium text-slate-500 underline underline-offset-4"
      >
        탈퇴하기
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-title-3 font-bold text-slate-900">정말 탈퇴하시겠어요?</DialogTitle>
            <DialogDescription className="text-body-3 font-medium break-keep text-slate-600">
              계정과 함께 이력서·자기소개서, 찜한 일자리·지원제도, 직업진단·지원금 진단 결과가 모두 삭제됩니다.
              삭제한 정보는 되돌릴 수 없어요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-body-3 font-semibold text-slate-700">
              떠나시는 이유를 알려주시겠어요? <span className="font-medium text-slate-600">(선택)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(reason === r ? null : r)}
                  className={cn(
                    /* 고른 이유는 파랑으로 채운다. 이 창은 .draft3-theme 바깥에 그려져 색 토큰을 직접 쓴다. */
                    "h-10 cursor-pointer rounded-full border px-4 text-body-3",
                    reason === r
                      ? "border-baro-blue bg-baro-blue font-semibold text-white"
                      : "border-slate-300 bg-white font-medium text-slate-700",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            {/* 무엇을 고쳐야 하는지는 이 칸에서만 나온다. 고른 이유가 있어도 함께 적을 수 있게 늘 열어 둔다. */}
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="더 하고 싶은 말씀이 있다면 적어주세요."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-body-2 font-medium outline-none placeholder:text-slate-500 focus-visible:border-ring"
            />
          </div>

          {error && <p className="text-body-3 font-medium text-red-600">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="h-12 rounded-xl border-slate-300 bg-white text-body-2 font-semibold text-slate-800" onClick={() => setOpen(false)} disabled={pending}>
              돌아가기
            </Button>
            <Button
              className="h-12 rounded-xl bg-red-600 text-body-2 font-semibold text-white hover:bg-red-700"
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
