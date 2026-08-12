import type { CrudRepository } from "./types";
import type { CoverLetterTemplate, CoverLetterTemplateInput } from "@/types";
import { InMemoryRepository } from "./mock/base.mock-repository";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseCoverLetterTemplateRepository } from "./supabase/cover-letter-template.supabase-repository";

const mockCoverLetterTemplates: CoverLetterTemplate[] = [
  {
    id: "cl-tpl-general",
    code: "GENERAL",
    name: "일반 자기소개서",
    description: "지원동기/경력/강점/문제해결/포부 중심의 범용 자기소개서 문항입니다.",
    targetType: "general",
    defaultQuestions: [
      { questionType: "MOTIVATION", question: "지원 동기를 작성해주세요.", characterLimit: 1000 },
      { questionType: "EXPERIENCE", question: "주요 경력 및 직무 경험을 작성해주세요.", characterLimit: 1500 },
      { questionType: "STRENGTH", question: "나의 강점을 작성해주세요.", characterLimit: 1000 },
      { questionType: "PROBLEM_SOLVING", question: "문제해결 또는 협업 경험을 작성해주세요.", characterLimit: 1500 },
      { questionType: "ASPIRATION", question: "입사 후 포부를 작성해주세요.", characterLimit: 1000 },
    ],
    status: "active",
    orderIndex: 1,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "cl-tpl-midlife",
    code: "MIDLIFE",
    name: "중장년 재취업 자기소개서",
    description: "경험/실무/안정성 중심으로 재취업 의지를 드러내는 중장년 특화 자기소개서입니다.",
    targetType: "midlife",
    defaultQuestions: [
      { questionType: "MOTIVATION", question: "지원 직무에 관심을 갖게 된 이유를 작성해주세요.", characterLimit: 1000 },
      { questionType: "EXPERIENCE", question: "지금까지의 경력과 주요 경험을 작성해주세요.", characterLimit: 1500 },
      { questionType: "JOB_FIT", question: "기존 경험을 지원 직무에서 어떻게 활용할 수 있는지 작성해주세요.", characterLimit: 1500 },
      { questionType: "STRENGTH", question: "업무상 강점을 작성해주세요.", characterLimit: 1000 },
      { questionType: "ASPIRATION", question: "재취업 후 목표와 장기근무 의지를 작성해주세요.", characterLimit: 1000 },
    ],
    status: "active",
    orderIndex: 2,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "cl-tpl-care-welfare",
    code: "CARE_WELFARE",
    name: "복지·돌봄 자기소개서",
    description: "대인관계/상담/책임감 등 돌봄 직무 역량을 드러내는 자기소개서입니다.",
    targetType: "care_welfare",
    defaultQuestions: [
      { questionType: "MOTIVATION", question: "지원 동기를 작성해주세요.", characterLimit: 1000 },
      { questionType: "FIELD_INTEREST", question: "복지/돌봄 분야에 관심을 갖게 된 계기를 작성해주세요.", characterLimit: 1000 },
      { questionType: "INTERPERSONAL", question: "대인관계 또는 상담 경험을 작성해주세요.", characterLimit: 1500 },
      { questionType: "CONFLICT_HANDLING", question: "갈등이나 민원에 대응했던 경험을 작성해주세요.", characterLimit: 1500 },
      { questionType: "RESPONSIBILITY", question: "책임감과 업무 태도에 대해 작성해주세요.", characterLimit: 1000 },
      { questionType: "CONTRIBUTION", question: "기관에서 기여할 수 있는 점을 작성해주세요.", characterLimit: 1000 },
    ],
    status: "active",
    orderIndex: 3,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  },
];

export type CoverLetterTemplateFilter = { status?: CoverLetterTemplate["status"] };
export type CoverLetterTemplateRepository = CrudRepository<
  CoverLetterTemplate,
  CoverLetterTemplateInput,
  CoverLetterTemplateFilter
>;

function createMockCoverLetterTemplateRepository(): CoverLetterTemplateRepository {
  return new InMemoryRepository<CoverLetterTemplate, CoverLetterTemplateInput, CoverLetterTemplateFilter>({
    initialData: mockCoverLetterTemplates,
    idPrefix: "cl-template",
    applyFilter: (item, filter) => !filter?.status || item.status === filter.status,
    buildEntity: (input, id) => {
      const now = new Date().toISOString();
      return {
        id,
        code: input.code,
        name: input.name,
        description: input.description,
        targetType: input.targetType ?? "general",
        defaultQuestions: input.defaultQuestions ?? [],
        status: input.status ?? "active",
        orderIndex: input.orderIndex ?? 0,
        createdAt: now,
        updatedAt: now,
      } satisfies CoverLetterTemplate;
    },
    applyUpdate: (item, input) => ({ ...item, ...input, updatedAt: new Date().toISOString() }),
  });
}

let repository: CoverLetterTemplateRepository | null = null;

export function getCoverLetterTemplateRepository(): CoverLetterTemplateRepository {
  if (!repository) {
    repository = resolveRepository("CoverLetterTemplateRepository", {
      mock: createMockCoverLetterTemplateRepository,
      supabase: createSupabaseCoverLetterTemplateRepository,
    });
  }
  return repository;
}
