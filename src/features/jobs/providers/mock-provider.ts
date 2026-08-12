import { mockJobs } from "@/mocks/jobs.mock";
import { BaseJobProvider } from "./base-provider";
import type { JobProviderName, JobProviderSearchParams, JobProviderSearchResult, NormalizedJob } from "./types";

/**
 * Mock Provider: WORK24_API_KEY가 없을 때 사용하는 기본 Provider.
 * 기존 seed jobs(mockJobs)를 "이미 외부에서 수집된 공고"처럼 정규화해 반환한다.
 * Job Sync Service / Job Search Service 입장에서는 Work24Provider와 완전히 동일한 인터페이스로 동작한다.
 */
export class MockJobProvider extends BaseJobProvider {
  getProviderName(): JobProviderName {
    return "mock";
  }

  private toNormalized(job: (typeof mockJobs)[number]): NormalizedJob {
    return {
      externalSource: "mock",
      externalId: job.id,
      companyName: job.companyName,
      title: job.title,
      description: job.description,
      jobCategory: job.jobCategory,
      occupationCode: job.jobCategory,
      occupationName: job.jobCategory,
      regionSido: job.region,
      address: job.locationDetail,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryText: job.salaryText,
      salaryType: "monthly",
      employmentType: job.workType,
      careerRequirement: job.isBeginnerFriendly ? "new" : "experienced",
      recommendedAgeGroups: job.recommendedAgeGroups,
      applyDeadline: job.applyDeadline,
      postedAt: job.createdAt,
      sourceUpdatedAt: job.updatedAt,
      sourceUrl: undefined,
      isActive: job.status === "published",
      rawPayload: job as unknown as Record<string, unknown>,
      fetchedAt: new Date().toISOString(),
    };
  }

  async searchJobs(params: JobProviderSearchParams): Promise<JobProviderSearchResult> {
    let items = mockJobs.map((job) => this.toNormalized(job));

    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      items = items.filter((j) => `${j.title} ${j.companyName} ${j.description ?? ""}`.toLowerCase().includes(kw));
    }
    if (params.occupation) {
      items = items.filter((j) => j.occupationCode === params.occupation);
    }
    if (params.region) {
      items = items.filter((j) => j.regionSido === params.region);
    }

    const start = (params.page - 1) * params.pageSize;
    const page = items.slice(start, start + params.pageSize);

    return {
      jobs: page,
      totalCount: items.length,
      page: params.page,
      pageSize: params.pageSize,
      hasMore: start + params.pageSize < items.length,
    };
  }

  async getJobDetail(externalId: string): Promise<NormalizedJob | null> {
    const job = mockJobs.find((j) => j.id === externalId);
    return job ? this.toNormalized(job) : null;
  }
}
