"use server";

import { revalidatePath } from "next/cache";
import type {
  CoverLetterTemplate,
  CoverLetterTemplateInput,
  Resume,
  ResumeTemplate,
  ResumeTemplateInput,
} from "@/types";
import { requireAdmin } from "@/lib/auth/session";
import {
  getCoverLetterRepository,
  getCoverLetterTemplateRepository,
  getResumeRepository,
  getResumeTemplateRepository,
} from "@/lib/repositories";

export async function listResumeTemplatesAdminAction(): Promise<ResumeTemplate[]> {
  await requireAdmin();
  const templates = await getResumeTemplateRepository().findAll({});
  return [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function listCoverLetterTemplatesAdminAction(): Promise<CoverLetterTemplate[]> {
  await requireAdmin();
  const templates = await getCoverLetterTemplateRepository().findAll({});
  return [...templates].sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function saveResumeTemplateAction(
  input: ResumeTemplateInput & { id?: string },
): Promise<ResumeTemplate> {
  await requireAdmin();
  const repo = getResumeTemplateRepository();
  const result = input.id ? await repo.update(input.id, input) : await repo.create(input);
  if (!result) throw new Error("Template 저장에 실패했습니다.");
  revalidatePath("/admin/resumes");
  return result;
}

export async function toggleResumeTemplateStatusAction(id: string): Promise<ResumeTemplate | null> {
  await requireAdmin();
  const repo = getResumeTemplateRepository();
  const template = await repo.findById(id);
  if (!template) return null;
  const updated = await repo.update(id, { status: template.status === "active" ? "inactive" : "active" });
  revalidatePath("/admin/resumes");
  return updated;
}

export async function saveCoverLetterTemplateAction(
  input: CoverLetterTemplateInput & { id?: string },
): Promise<CoverLetterTemplate> {
  await requireAdmin();
  const repo = getCoverLetterTemplateRepository();
  const result = input.id ? await repo.update(input.id, input) : await repo.create(input);
  if (!result) throw new Error("Template 저장에 실패했습니다.");
  revalidatePath("/admin/resumes");
  return result;
}

export async function toggleCoverLetterTemplateStatusAction(id: string): Promise<CoverLetterTemplate | null> {
  await requireAdmin();
  const repo = getCoverLetterTemplateRepository();
  const template = await repo.findById(id);
  if (!template) return null;
  const updated = await repo.update(id, { status: template.status === "active" ? "inactive" : "active" });
  revalidatePath("/admin/resumes");
  return updated;
}

export interface ResumeUsageStats {
  totalResumes: number;
  completedResumes: number;
  averageCompleteness: number;
  totalCoverLetters: number;
  jobLinkedResumes: number;
  byTemplate: { templateId: string | undefined; templateName: string; count: number }[];
}

export async function getResumeUsageStatsAction(): Promise<ResumeUsageStats> {
  await requireAdmin();
  const [resumes, coverLetters, templates] = await Promise.all([
    getResumeRepository().findAll({}),
    getCoverLetterRepository().findAll({}),
    getResumeTemplateRepository().findAll({}),
  ]);
  const templateNameById = new Map(templates.map((t) => [t.id, t.name]));

  const byTemplateMap = new Map<string | undefined, number>();
  for (const resume of resumes as Resume[]) {
    byTemplateMap.set(resume.templateId, (byTemplateMap.get(resume.templateId) ?? 0) + 1);
  }

  return {
    totalResumes: resumes.length,
    completedResumes: resumes.filter((r) => r.status === "completed").length,
    averageCompleteness: resumes.length
      ? Math.round(resumes.reduce((sum, r) => sum + (r.completeness ?? 0), 0) / resumes.length)
      : 0,
    totalCoverLetters: coverLetters.length,
    jobLinkedResumes: resumes.filter((r) => Boolean(r.targetJobId)).length,
    byTemplate: [...byTemplateMap.entries()].map(([templateId, count]) => ({
      templateId,
      templateName: templateId ? templateNameById.get(templateId) ?? "알수없음" : "템플릿 없음",
      count,
    })),
  };
}
