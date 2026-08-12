"use client";

import { useEffect, useRef } from "react";
import { getLocalJobBookmarkIds, clearLocalJobBookmarks } from "@/lib/jobs/job-bookmark-local";
import { getLocalSupportBookmarkIds, clearLocalSupportBookmarks } from "@/lib/support/support-bookmark-local";
import { mergeLocalJobBookmarksAction } from "@/features/jobs/job-actions";
import { mergeLocalSupportBookmarksAction } from "@/features/support/support-actions";

/**
 * 로그인 사용자에게만 렌더링된다 (site-header-client.tsx가 아니라 layout에서 user 유무로 제어).
 *
 * 로그인 상태에서 마운트되면, STEP4/5에서 비회원 지원을 위해 만들어졌던 localStorage 찜 데이터를
 * 1회 DB로 병합하고 localStorage를 비운다. 병합 후에는 localStorage가 비어있으므로 재마운트되어도
 * 다시 병합할 것이 없다 (별도 플래그 없이 자연스럽게 idempotent).
 *
 * 신규 가입 회원의 정상 Flow에서는 localStorage가 원래 비어있으므로 이 컴포넌트는 아무 일도 하지 않는다
 * (Member-first 원칙 - localStorage가 Primary Storage가 되지 않는다. 스펙 41번).
 */
export function BookmarkMergeOnLogin() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const jobIds = getLocalJobBookmarkIds();
    const supportIds = getLocalSupportBookmarkIds();

    if (jobIds.length > 0) {
      void mergeLocalJobBookmarksAction(jobIds)
        .then(() => clearLocalJobBookmarks())
        .catch(() => {
          // 실패해도 로그인 Flow에는 영향 없음 - 다음 방문 때 다시 시도된다.
        });
    }
    if (supportIds.length > 0) {
      void mergeLocalSupportBookmarksAction(supportIds)
        .then(() => clearLocalSupportBookmarks())
        .catch(() => {});
    }
  }, []);

  return null;
}
