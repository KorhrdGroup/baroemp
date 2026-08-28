"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * 삭제 확인 창.
 *
 * window.confirm 을 쓰면 브라우저·임베드 환경에 따라 창이 뜨지 않고 취소로 처리되어
 * 삭제가 조용히 무시된다. 앱 안에서 그리면 어디서 열어도 같게 동작하고,
 * 무엇을 지우는지 이름까지 보여줄 수 있다.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "삭제",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/*
          공용 DialogFooter 의 회색 띠(bg-muted/50 + 위 테두리)를 걷어낸다.
          묻는 말 한 줄과 버튼 둘뿐인 창이라 영역을 나눌 것이 없다.
        */}
        <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent p-0 pt-2">
          {/* 두 버튼은 크기·모양을 맞추고 색으로만 무게를 가른다. */}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="min-w-24"
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            disabled={pending}
            className="min-w-24 bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/80"
          >
            {pending ? <Loader2 className="animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
