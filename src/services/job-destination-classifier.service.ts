import { getEmploymentDestinationRepository, getJobRepository, getOccupationRepository } from "@/lib/repositories";
import type { EmploymentDestination, Job } from "@/types";

/**
 * Job -> Employment Destination 분류 (STEP 7.5 스펙 5번).
 * V1은 Rule/Keyword 기반이다. destination.classifierKeywords 중 title/company/description에
 * 가장 많이 매칭되는 destination을 선택한다 (동률이면 orderIndex가 낮은 destination을 우선한다).
 *
 * 향후 AI Classification으로 교체하더라도 classifyJob()의 시그니처만 유지하면
 * 호출부(재분류 배치, Job Sync 이후 재분류 등)를 바꿀 필요가 없다.
 */
export function classifyJob(job: Job, destinations: EmploymentDestination[]): EmploymentDestination | null {
  if (destinations.length === 0) return null;
  const haystack = `${job.title} ${job.companyName} ${job.description ?? ""}`.toLowerCase();

  let best: { destination: EmploymentDestination; score: number } | null = null;
  for (const destination of destinations) {
    const score = destination.classifierKeywords.filter((keyword) => haystack.includes(keyword.toLowerCase())).length;
    if (score === 0) continue;
    if (!best || score > best.score || (score === best.score && destination.orderIndex < best.destination.orderIndex)) {
      best = { destination, score };
    }
  }
  return best?.destination ?? null;
}

/**
 * 특정 occupation에 속한 jobCategory의 활성 공고를 전부 순회해 destination을 재분류하고
 * jobs.employment_destination_id를 갱신한다 (관리자 수동 재분류/Job Sync 이후 배치용).
 */
export async function classifyJobsForOccupation(occupationId: string): Promise<{ scanned: number; classified: number }> {
  const [occupation, destinations] = await Promise.all([
    getOccupationRepository().findById(occupationId),
    getEmploymentDestinationRepository().findAll({ occupationId, status: "active" }),
  ]);
  if (!occupation?.jobCategoryCode || destinations.length === 0) return { scanned: 0, classified: 0 };

  const jobRepo = getJobRepository();
  const jobs = await jobRepo.findAll({ jobCategory: occupation.jobCategoryCode, activeOnly: false } as never);

  let classified = 0;
  for (const job of jobs) {
    const destination = classifyJob(job, destinations);
    if (destination && job.employmentDestinationId !== destination.id) {
      await jobRepo.update(job.id, { employmentDestinationId: destination.id } as never);
      classified += 1;
    }
  }
  return { scanned: jobs.length, classified };
}
