"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

/**
 * 이력서·자기소개서의 더보기 메뉴. 목록 카드 오른쪽과 편집 화면 하단바에서 함께 쓴다.
 *
 * 목록에서는 전에 아무 동작도 없는 연필 아이콘(16px) 바로 옆 8px 자리에 삭제 버튼(32px)이
 * 있었다. 수정하려고 연필을 겨눴다가 조금만 빗나가면 삭제가 눌린다. 게다가 연필은
 * 버튼이 아니라 그림이라, 눌러서 편집으로 가는 건 카드 전체가 링크인 덕이었다.
 *
 * 되돌릴 수 없는 동작은 한 겹 안으로 넣는다. 여는 버튼은 40px로 키우고, 메뉴 안에서는
 * 아이콘이 아니라 글자로 고른다.
 *
 * 목록에서는 카드 전체가 Link라 메뉴 안에서의 클릭이 편집으로 새지 않게 전파를 막는다.
 */
export function DocumentMenu({
  label,
  editHref,
  onEdit,
  title,
  onSetPrimary,
  isPrimary,
  deleteNote,
  onDelete,
  afterDelete,
}: {
  /** "이력서" / "자기소개서". 읽어주는 이름과 확인 문구에 쓴다. */
  label: string;
  /** 목록에서만 준다. 편집 화면에서는 이미 그 문서를 보고 있어 "수정하기"가 갈 곳이 없다. */
  editHref?: string;
  /** 수정이 페이지 이동이 아니라 모달인 경우(경험뱅크). editHref 대신 준다. */
  onEdit?: () => void;
  /** 무엇을 지우는지 확인 창에서 이름으로 물어본다. */
  title?: string;
  /** 지우면 무엇이 남고 무엇이 사라지는지 덧붙일 말. 확인 창에서 한 줄 더 보여준다. */
  deleteNote?: string;
  /**
   * 대표로 지정. 이력서 목록에서만 준다 - 자기소개서에는 대표라는 개념이 없다.
   * 이미 대표인 문서에는 눌리지 않는 자리로 남겨, 줄마다 메뉴 모양이 달라지지 않게 한다.
   */
  onSetPrimary?: () => Promise<void>;
  isPrimary?: boolean;
  onDelete: () => Promise<void>;
  /**
   * 지운 뒤 할 일. 편집 화면은 보던 문서가 사라지므로 목록으로 나가야 한다.
   * 목록을 스스로 들고 있는 화면은 빈 함수를 줘서 새로고침을 막는다.
   */
  afterDelete?: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startDelete] = useTransition();
  const [settingPrimary, startSetPrimary] = useTransition();
  const busy = pending || settingPrimary;

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div onClick={stop}>
      {/*
        modal(기본값)은 여는 순간 body 스크롤을 잠그며 스크롤바를 없애서
        페이지 전체가 옆으로 덜컹인다. 작은 메뉴라 스크롤을 잠글 이유가 없다.
      */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${label} 더보기`}
            className="text-slate-400"
            disabled={busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          {editHref ? (
            <DropdownMenuItem asChild className="py-2 text-label-1">
              <Link href={editHref}>
                <Pencil /> 수정하기
              </Link>
            </DropdownMenuItem>
          ) : onEdit ? (
            <DropdownMenuItem className="py-2 text-label-1" onSelect={onEdit}>
              <Pencil /> 수정하기
            </DropdownMenuItem>
          ) : null}
          {onSetPrimary && (
            <DropdownMenuItem
              className="py-2 text-label-1"
              disabled={isPrimary}
              onSelect={() => {
                startSetPrimary(async () => {
                  await onSetPrimary();
                  router.refresh();
                });
              }}
            >
              <Star className={isPrimary ? "fill-brand-blue-400 text-brand-blue-400" : undefined} />
              {isPrimary ? `대표 ${label}` : "대표로 지정"}
            </DropdownMenuItem>
          )}
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
        description={[title?.trim() ? `${title.trim()} · 삭제하면 되돌릴 수 없습니다.` : "삭제하면 되돌릴 수 없습니다.", deleteNote]
          .filter(Boolean)
          .join(" ")}
        pending={pending}
        onConfirm={() => {
          startDelete(async () => {
            await onDelete();
            setConfirming(false);
            if (afterDelete) afterDelete();
            else router.refresh();
          });
        }}
      />
    </div>
  );
}
