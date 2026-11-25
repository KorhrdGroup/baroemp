import { JobCard } from "@/features/jobs/job-card";
import type { Job } from "@/types";

/*
  시안 홈의 공고 카드. 일자리찾기 목록과 같은 카드(features/jobs/job-card)를 쓴다 -
  홈에서 본 카드와 목록에서 본 카드가 달라 보이지 않게.
*/
export { daysLeft, deadlineLabel, shortLocation } from "@/features/jobs/job-card";

export function DraftJobCard({
  job,
  isAuthenticated,
  isBookmarked,
  borderless = false,
}: {
  job: Job;
  isAuthenticated: boolean;
  isBookmarked: boolean;
  /** 회색 판 위에 놓일 때는 테두리 없이 흰 면만으로 띄운다. */
  borderless?: boolean;
}) {
  return <JobCard job={job} isAuthenticated={isAuthenticated} isBookmarked={isBookmarked} borderless={borderless} />;
}
