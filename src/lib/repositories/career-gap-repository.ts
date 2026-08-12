import type { CareerGapAnalysis, CareerGapAnalysisInput, CareerGapItem, CareerGapItemInput } from "@/types";
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseCareerGapRepository } from "./supabase/career-gap.supabase-repository";

/**
 * Career Gap Analysis + Items를 항상 함께 다루는 전용 Repository.
 * Resume Detail(스펙 17-49)과 동일한 철학으로, 결과 하나 = header(analysis) + 하위 items 묶음으로 취급한다.
 */
export interface CareerGapRepository {
  createAnalysis(
    input: CareerGapAnalysisInput,
    items: CareerGapItemInput[],
  ): Promise<{ analysis: CareerGapAnalysis; items: CareerGapItem[] }>;
  findAnalysisById(id: string): Promise<CareerGapAnalysis | null>;
  findItemsByAnalysisId(analysisId: string): Promise<CareerGapItem[]>;
  findAnalysesByUserId(userId: string, limit?: number): Promise<CareerGapAnalysis[]>;
  /** 관리자 시장분석(스펙 39번) 전용 - 전체 회원의 분석을 조회한다. */
  findAllAnalyses(limit?: number): Promise<CareerGapAnalysis[]>;
  findItemsByAnalysisIds(analysisIds: string[]): Promise<CareerGapItem[]>;
}

function createMockCareerGapRepository(): CareerGapRepository {
  let analyses: CareerGapAnalysis[] = [];
  let items: CareerGapItem[] = [];
  let seq = 0;

  return {
    async createAnalysis(input, itemInputs) {
      seq += 1;
      const analysis: CareerGapAnalysis = {
        ...input,
        id: `gap-analysis-${Date.now()}-${seq}`,
        analysisVersion: input.analysisVersion ?? 1,
        createdAt: new Date().toISOString(),
      };
      analyses = [analysis, ...analyses];
      const createdItems = itemInputs.map((itemInput, i) => {
        const item: CareerGapItem = {
          ...itemInput,
          id: `gap-item-${Date.now()}-${seq}-${i}`,
          analysisId: analysis.id,
          createdAt: new Date().toISOString(),
        };
        return item;
      });
      items = [...items, ...createdItems];
      return { analysis, items: createdItems };
    },
    async findAnalysisById(id) {
      return analyses.find((a) => a.id === id) ?? null;
    },
    async findItemsByAnalysisId(analysisId) {
      return items.filter((item) => item.analysisId === analysisId).sort((a, b) => a.orderIndex - b.orderIndex);
    },
    async findAnalysesByUserId(userId, limit = 10) {
      return analyses
        .filter((a) => a.userId === userId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, limit);
    },
    async findAllAnalyses(limit = 500) {
      return [...analyses].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
    },
    async findItemsByAnalysisIds(analysisIds) {
      const set = new Set(analysisIds);
      return items.filter((item) => set.has(item.analysisId));
    },
  };
}

let repository: CareerGapRepository | null = null;

export function getCareerGapRepository(): CareerGapRepository {
  if (!repository) {
    repository = resolveRepository("CareerGapRepository", {
      mock: createMockCareerGapRepository,
      supabase: createSupabaseCareerGapRepository,
    });
  }
  return repository;
}
