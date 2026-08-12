import { mockSupportPrograms } from "@/mocks/support-programs.mock";
import { BaseSupportProvider } from "./base-provider";
import type {
  NormalizedSupportProgram,
  NormalizedSupportProgramRule,
  SupportProviderName,
  SupportProviderSearchParams,
  SupportProviderSearchResult,
} from "./types";

/**
 * MockSupportProvider: PUBLIC_SERVICE_API_KEY가 없을 때 기본으로 활성화되는 Provider.
 * mocks/support-programs.mock.ts 시드 데이터를 NormalizedSupportProgram으로 변환한다.
 *
 * 실 API(행안부 공공서비스 정보)는 대부분 자연어 대상조건만 제공하므로 구조화 Rule을
 * 알 수 없는 경우가 많다. Mock Provider는 Eligibility Rule Engine이 실제로 동작하는
 * 모습을 보여주기 위해 일부 프로그램에 한해 구조화 Rule 힌트(MOCK_RULES)를 함께 제공한다.
 */
const MOCK_RULES: Record<string, NormalizedSupportProgramRule[]> = {
  "support-001": [
    { field: "age", operator: "BETWEEN", value: [40, 69], weight: 20, isRequired: false },
    {
      field: "employment_status",
      operator: "IN",
      value: ["unemployed", "career_break"],
      weight: 25,
      isRequired: true,
    },
  ],
  "support-002": [
    { field: "age", operator: "BETWEEN", value: [15, 99], weight: 10, isRequired: false },
    { field: "training_willingness", operator: "GTE", value: 2, weight: 20, isRequired: false },
  ],
  "support-003": [
    { field: "age", operator: "GTE", value: 60, weight: 30, isRequired: true },
    {
      field: "employment_status",
      operator: "IN",
      value: ["unemployed", "retired_seeking"],
      weight: 15,
      isRequired: false,
    },
  ],
  "support-004": [
    { field: "employment_status", operator: "IN", value: ["career_break"], weight: 30, isRequired: true },
    { field: "age", operator: "BETWEEN", value: [30, 59], weight: 15, isRequired: false },
  ],
  "support-005": [
    { field: "region", operator: "IN", value: ["seoul"], weight: 25, isRequired: true },
    { field: "age", operator: "GTE", value: 40, weight: 15, isRequired: false },
  ],
  "support-006": [
    { field: "employment_status", operator: "IN", value: ["unemployed"], weight: 30, isRequired: true },
    { field: "age", operator: "BETWEEN", value: [34, 69], weight: 15, isRequired: false },
  ],
};

function toNormalized(program: (typeof mockSupportPrograms)[number]): NormalizedSupportProgram {
  return {
    externalSource: "mock",
    externalId: program.id,
    title: program.title,
    organizationName: program.organizationName ?? program.organization,
    departmentName: program.departmentName,
    summary: program.summary,
    description: program.description,
    category: program.category,
    supportType: program.supportType,
    targetDescription: program.targetDescription,
    targetAgeGroups: program.targetAgeGroups,
    targetAgeMin: program.targetAgeMin,
    targetAgeMax: program.targetAgeMax,
    regionScope: program.regionScope,
    employmentStatusTargets: program.employmentStatusTargets,
    incomeCondition: program.incomeCondition,
    careerCondition: program.careerCondition,
    householdCondition: program.householdCondition,
    educationCondition: program.educationCondition,
    jobCondition: program.jobCondition,
    eligibilityRaw: program.eligibilityRaw,
    rules: MOCK_RULES[program.id],
    benefitDescription: program.benefitDescription,
    supportAmountText: program.supportAmountText,
    applicationPeriod: program.applicationPeriod,
    applicationStartAt: program.applyStartAt,
    applicationEndAt: program.applyEndAt,
    applicationMethod: program.applicationMethod,
    requiredDocuments: program.requiredDocuments,
    contact: program.contact,
    tags: program.tags,
    relatedJobCategories: program.relatedJobCategories,
    relatedQualificationCodes: program.relatedQualificationCodes,
    sourceUrl: program.sourceUrl ?? program.applyUrl,
    isActive: program.isActive,
    rawPayload: program as unknown as Record<string, unknown>,
    fetchedAt: new Date().toISOString(),
  };
}

export class MockSupportProvider extends BaseSupportProvider {
  getProviderName(): SupportProviderName {
    return "mock";
  }

  async searchPrograms(params: SupportProviderSearchParams): Promise<SupportProviderSearchResult> {
    const all = mockSupportPrograms.map(toNormalized);
    const start = (params.page - 1) * params.pageSize;
    const page = all.slice(start, start + params.pageSize);
    return {
      programs: page,
      totalCount: all.length,
      page: params.page,
      pageSize: params.pageSize,
      hasMore: start + params.pageSize < all.length,
    };
  }

  async getProgramDetail(externalId: string): Promise<NormalizedSupportProgram | null> {
    const found = mockSupportPrograms.find((p) => p.id === externalId);
    return found ? toNormalized(found) : null;
  }
}
