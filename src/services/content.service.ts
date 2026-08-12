import { attachRecommendationRules, attachRecommendationRulesToAll } from "@/lib/content/with-rules";
import { matchingEngine } from "@/lib/matching/engine";
import { getContentRepository, getCareerProfileRepository } from "@/lib/repositories";
import { mockAdminUsers } from "@/mocks/users.mock";
import { mockContentRecommendationRules } from "@/mocks/content-rules.mock";
import type {
  CareerContent,
  CareerContentInput,
  ContentRecommendationRuleRow,
  PotentialCustomerSummary,
} from "@/types";

function toGrade(score: number): "A" | "B" | "C" | "D" {
  if (score >= 60) return "A";
  if (score >= 40) return "B";
  if (score >= 20) return "C";
  return "D";
}

export async function listContents(filter?: {
  type?: string;
  status?: string;
  keyword?: string;
}): Promise<CareerContent[]> {
  const repo = getContentRepository();
  const items = await repo.findAll({
    type: filter?.type as CareerContent["type"] | undefined,
    status: filter?.status as CareerContent["status"] | undefined,
    keyword: filter?.keyword,
  });
  return attachRecommendationRulesToAll(items);
}

export async function getContentById(id: string): Promise<CareerContent | null> {
  const repo = getContentRepository();
  const item = await repo.findById(id);
  return item ? attachRecommendationRules(item) : null;
}

export async function createContent(input: CareerContentInput): Promise<CareerContent> {
  const repo = getContentRepository();
  const created = await repo.create(input);
  return attachRecommendationRules(created);
}

export async function updateContent(
  id: string,
  input: Partial<CareerContentInput>,
): Promise<CareerContent | null> {
  const repo = getContentRepository();
  const updated = await repo.update(id, input);
  return updated ? attachRecommendationRules(updated) : null;
}

export async function analyzePotentialCustomers(
  contentId: string,
  limit = 50,
): Promise<PotentialCustomerSummary | null> {
  const content = await getContentById(contentId);
  if (!content) return null;

  const profiles = await getCareerProfileRepository().findAll();
  const matches = matchingEngine.matchProfilesForContent(content, profiles, limit);

  const nameByUserId = new Map(mockAdminUsers.map((u) => [u.id, u.name]));

  const customers = matches.map((m) => ({
    userId: m.targetId,
    name: nameByUserId.get(m.targetId) ?? m.targetId,
    score: m.score,
    grade: toGrade(m.score),
    reasons: m.reasons,
  }));

  return {
    contentId: content.id,
    contentTitle: content.title,
    total: customers.length,
    gradeA: customers.filter((c) => c.grade === "A").length,
    gradeB: customers.filter((c) => c.grade === "B").length,
    gradeC: customers.filter((c) => c.grade === "C").length,
    gradeD: customers.filter((c) => c.grade === "D").length,
    customers,
  };
}

export function listContentRules(contentId: string): ContentRecommendationRuleRow[] {
  return mockContentRecommendationRules.filter((r) => r.contentId === contentId);
}
