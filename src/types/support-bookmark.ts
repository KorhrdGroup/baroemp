import type { ISODateString } from "./common";

/**
 * Support Bookmark: 회원의 지원제도 찜.
 * 비회원은 DB에 저장하지 않고 브라우저 localStorage에 supportProgramId 배열로 보관하다가,
 * 회원가입/로그인 시 mergeSupportIds()로 서버에 병합한다 (job_bookmarks와 동일한 철학).
 */
export interface SupportBookmark {
  id: string;
  userId: string;
  supportProgramId: string;
  createdAt: ISODateString;
}

export type SupportBookmarkInput = Pick<SupportBookmark, "userId" | "supportProgramId">;
