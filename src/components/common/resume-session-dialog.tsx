"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * 하다 만 진단이 있을 때 시작 버튼을 누르는 순간 띄우는 확인 팝업.
 *
 * 소개 화면에 배너로 두면 그냥 지나치고 시작 버튼을 눌러 처음부터 다시 하게 된다.
 * 선택을 해야 넘어가는 시점에 물어야 이전 답변이 버려지지 않는다.
 */
export function ResumeSessionDialog({
  open,
  onOpenChange,
  progressLabel,
  updatedAt,
  onResume,
  onRestart,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "28문항 중 7문항" 처럼 어디까지 했는지 */
  progressLabel?: string;
  updatedAt?: string;
  onResume: () => void;
  onRestart: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>이전에 하던 진단이 있습니다</DialogTitle>
          <DialogDescription>
            {progressLabel ? `${progressLabel}까지 진행했습니다.` : "진행 중인 내용이 남아 있습니다."}
            {updatedAt ? ` (${updatedAt.slice(0, 10)})` : ""}
            <br />
            이어서 진행하시겠습니까? 처음부터 다시 하면 이전 답변은 사용되지 않습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onRestart}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            처음부터 다시
          </Button>
          <Button
            onClick={onResume}
            disabled={busy}
            className="w-full bg-brand-blue-400 hover:bg-brand-blue-600 sm:w-auto"
          >
            이어서 하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
