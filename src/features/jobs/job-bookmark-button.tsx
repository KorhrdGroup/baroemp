"use client";

import { useCallback, useState, useSyncExternalStore, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import {
  isLocalJobBookmarked,
  subscribeLocalJobBookmarks,
  toggleLocalJobBookmark,
} from "@/lib/jobs/job-bookmark-local";
import { toggleJobBookmarkAction, trackAnonymousJobBookmarkAction } from "@/features/jobs/job-actions";

/**
 * 채용공고 찜 버튼.
 *
 * /jobs는 Member-first 보호 Route이므로 정상 Flow에서는 항상 로그인 사용자다.
 * `isAuthenticated`가 true면 DB(job_bookmarks)를 직접 사용하고(userId는 서버 세션에서만 도출),
 * false인 경우(예외적 상황/과거 호환)에만 localStorage로 폴백한다.
 */
export function JobBookmarkButton({
  jobId,
  variant = "icon",
  isAuthenticated = false,
  initialBookmarked = false,
  className,
}: {
  jobId: string;
  /** 향후 통계/추천 확장을 위해 호출부에서 넘겨줄 수 있게 열어둔 필드 (현재는 사용하지 않음). */
  jobCategory?: string;
  variant?: "icon" | "full";
  isAuthenticated?: boolean;
  initialBookmarked?: boolean;
  /** 카드가 통째로 Link일 때 버튼을 겹쳐 놓기 위한 위치 지정용. */
  className?: string;
}) {
  const [dbBookmarked, setDbBookmarked] = useState(initialBookmarked);
  const [pending, startTransition] = useTransition();

  const getSnapshot = useCallback(() => isLocalJobBookmarked(jobId), [jobId]);
  const getServerSnapshot = useCallback(() => false, []);
  const localBookmarked = useSyncExternalStore(subscribeLocalJobBookmarks, getSnapshot, getServerSnapshot);

  const bookmarked = isAuthenticated ? dbBookmarked : localBookmarked;

  const handleClick = () => {
    if (isAuthenticated) {
      const next = !dbBookmarked;
      setDbBookmarked(next);
      startTransition(async () => {
        try {
          await toggleJobBookmarkAction({ jobId, action: next ? "add" : "remove" });
        } catch {
          setDbBookmarked(!next);
        }
      });
      return;
    }

    const next = toggleLocalJobBookmark(jobId);
    void trackAnonymousJobBookmarkAction({
      anonymousId: getOrCreateAnonymousId(),
      jobId,
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
        <Bookmark
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
        "flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
        bookmarked
          ? "border-brand-blue-200 bg-brand-blue-50 text-brand-blue-600"
          : "border-border bg-white text-slate-400",
        className,
      )}
    >
      <Bookmark className={cn("size-[18px]", bookmarked && "fill-current")} />
    </button>
  );
}
