"use client";

import { useCallback, useState, useSyncExternalStore, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import {
  isLocalSupportBookmarked,
  subscribeLocalSupportBookmarks,
  toggleLocalSupportBookmark,
} from "@/lib/support/support-bookmark-local";
import { toggleSupportBookmarkAction, trackAnonymousSupportBookmarkAction } from "@/features/support/support-actions";

/**
 * 지원제도 찜 버튼. JobBookmarkButton과 동일한 철학.
 * /support는 Member-first 보호 Route이므로 정상 Flow에서는 항상 로그인 사용자다.
 * `isAuthenticated`가 true면 DB(support_bookmarks)를 사용하고(userId는 서버 세션에서만 도출),
 * false인 경우(예외적 상황/과거 호환)에만 localStorage로 폴백한다.
 */
export function SupportBookmarkButton({
  supportProgramId,
  variant = "icon",
  className,
  isAuthenticated = false,
  initialBookmarked = false,
}: {
  supportProgramId: string;
  variant?: "icon" | "full";
  /** 카드가 통째로 Link일 때 버튼을 겹쳐 놓기 위한 위치 지정용. */
  className?: string;
  isAuthenticated?: boolean;
  initialBookmarked?: boolean;
}) {
  const [dbBookmarked, setDbBookmarked] = useState(initialBookmarked);
  const [pending, startTransition] = useTransition();

  const getSnapshot = useCallback(() => isLocalSupportBookmarked(supportProgramId), [supportProgramId]);
  const getServerSnapshot = useCallback(() => false, []);
  const localBookmarked = useSyncExternalStore(subscribeLocalSupportBookmarks, getSnapshot, getServerSnapshot);

  const bookmarked = isAuthenticated ? dbBookmarked : localBookmarked;

  const handleClick = () => {
    if (isAuthenticated) {
      const next = !dbBookmarked;
      setDbBookmarked(next);
      startTransition(async () => {
        try {
          await toggleSupportBookmarkAction({ supportProgramId, action: next ? "add" : "remove" });
        } catch {
          setDbBookmarked(!next);
        }
      });
      return;
    }

    const next = toggleLocalSupportBookmark(supportProgramId);
    void trackAnonymousSupportBookmarkAction({
      anonymousId: getOrCreateAnonymousId(),
      supportProgramId,
      action: next ? "add" : "remove",
    });
  };

  if (variant === "full") {
    return (
      <Button type="button" variant="outline" onClick={handleClick} disabled={pending}>
        {/*
          찜은 하단바에서 "지원하러 가기" 옆에 선다. 채운 파랑으로 두면 파란 버튼이
          둘이 되어 어느 것이 주 동작인지 흐려진다. 흰 버튼으로 두고 찜한 상태만
          책갈피를 파랗게 채워 알린다.
        */}
        <Star
          className={cn("size-4", bookmarked ? "fill-brand-blue-400 text-brand-blue-400" : "text-slate-400")}
        />
        {bookmarked ? "찜 완료" : "찜하기"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={bookmarked ? "찜 취소" : "찜하기"}
      aria-pressed={bookmarked}
      className={cn(
        // 크기는 공고 카드의 찜 버튼과 같게 둔다. 같은 동작이 카드마다 다른 크기면 안 된다.
        "flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
        bookmarked
          ? "border-brand-blue-200 bg-brand-blue-50 text-brand-blue-600"
          : "border-border bg-white text-slate-400",
        className,
      )}
    >
      <Star className={cn("size-[18px]", bookmarked && "fill-current")} />
    </button>
  );
}
