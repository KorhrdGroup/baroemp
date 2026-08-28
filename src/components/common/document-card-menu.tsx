"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

/**
 * 이력서·자기소개서 목록 카드 오른쪽의 더보기 메뉴.
 *
 * 전에는 아무 동작도 없는 연필 아이콘(16px) 바로 옆 8px 자리에 삭제 버튼(32px)이
 * 있었다. 수정하려고 연필을 겨눴다가 조금만 빗나가면 삭제가 눌린다. 게다가 연필은
 * 버튼이 아니라 그림이라, 눌러서 편집으로 가는 건 카드 전체가 링크인 덕이었다.
 *
 * 되돌릴 수 없는 동작은 한 겹 안으로 넣는다. 여는 버튼은 40px로 키우고, 메뉴 안에서는
 * 아이콘이 아니라 "수정하기" / "삭제"라고 글자로 고른다.
 *
 * 카드 전체가 Link라 메뉴 안에서의 클릭이 편집으로 새지 않게 전파를 막는다.
 */
export function DocumentCardMenu({
  label,
  editHref,
  title,
  onDelete,
}: {
  /** "이력서" / "자기소개서". 읽어주는 이름과 확인 문구에 쓴다. */
  label: string;
  editHref: string;
  /** 무엇을 지우는지 확인 창에서 이름으로 물어본다. */
  title?: string;
  onDelete: () => Promise<void>;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startDelete] = useTransition();

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div onClick={stop}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${label} 더보기`}
            className="text-slate-400"
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          <DropdownMenuItem asChild className="py-2 text-label-1">
            <Link href={editHref}>
              <Pencil /> 수정하기
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="py-2 text-label-1"
            onSelect={() => setConfirming(true)}
          >
            <Trash2 /> 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`이 ${label}를 삭제할까요?`}
        /*
          묻는 말에 제목을 넣으면 "'...이력서'을(를)" 처럼 조사가 어색해진다.
          제목은 아래 줄로 내려 무엇을 지우는지만 밝힌다.
        */
        description={
          title?.trim() ? `${title.trim()} · 삭제하면 되돌릴 수 없습니다.` : "삭제하면 되돌릴 수 없습니다."
        }
        pending={pending}
        onConfirm={() => {
          startDelete(async () => {
            await onDelete();
            setConfirming(false);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
