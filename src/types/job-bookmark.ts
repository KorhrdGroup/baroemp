import type { ISODateString } from "./common";

/**
 * Job Bookmark: 회원의 채용공고 찜.
 * 비회원은 DB에 저장하지 않고 브라우저 localStorage에 jobId 배열로 보관하다가,
 * 회원가입/로그인 시 mergeLocalBookmarksToUser()로 서버에 병합한다.
 */
export interface JobBookmark {
  id: string;
  userId: string;
  jobId: string;
  createdAt: ISODateString;
}

export type JobBookmarkInput = Pick<JobBookmark, "userId" | "jobId">;
