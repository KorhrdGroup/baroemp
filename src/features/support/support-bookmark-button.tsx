"use client";

import { useCallback, useState, useSyncExternalStore, useTransition } from "react";
import { Bookmark } from "lucide-react";
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
  isAuthenticated = false,
  initialBookmarked = false,
}: {
  supportProgramId: string;
  variant?: "icon" | "full";
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
      <Button
        type="button"
        variant={bookmarked ? "default" : "outline"}
        className={cn(bookmarked && "bg-brand-blue-400 hover:bg-brand-blue-600")}
        onClick={handleClick}
        disabled={pending}
      >
        <Bookmark className={cn("size-4", bookmarked && "fill-current")} />
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
        "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
        bookmarked
          ? "border-brand-blue-200 bg-brand-blue-50 text-brand-blue-600"
          : "border-border bg-white text-slate-400",
      )}
    >
      <Bookmark className={cn("size-4", bookmarked && "fill-current")} />
    </button>
  );
}
