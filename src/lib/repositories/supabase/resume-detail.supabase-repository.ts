import type {
  ResumeEducation,
  ResumeEducationInput,
  ResumeExperience,
  ResumeExperienceInput,
  ResumeItem,
  ResumeItemInput,
  ResumeQualification,
  ResumeQualificationInput,
  ResumeSkill,
  ResumeSkillInput,
  ResumeTraining,
  ResumeTrainingInput,
} from "@/types";
import type { ResumeDetailRepository } from "../resume-detail-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList } from "./query-helpers";

function mapEducation(row: Record<string, unknown>): ResumeEducation {
  return {
    id: String(row.id),
    resumeId: String(row.resume_id),
    schoolName: String(row.school_name),
    educationType: (row.education_type as string | null) ?? undefined,
    major: (row.major as string | null) ?? undefined,
    degree: (row.degree as string | null) ?? undefined,
    admissionDate: (row.admission_date as string | null) ?? undefined,
    graduationDate: (row.graduation_date as string | null) ?? undefined,
    graduationStatus: (row.graduation_status as string | null) ?? undefined,
    description: (row.description as string | null) ?? undefined,
    orderIndex: Number(row.order_index ?? 0),
  };
}

function mapExperience(row: Record<string, unknown>): ResumeExperience {
  return {
    id: String(row.id),
    resumeId: String(row.resume_id),
    companyName: String(row.company_name),
    department: (row.department as string | null) ?? undefined,
    position: (row.position as string | null) ?? undefined,
    employmentType: (row.employment_type as string | null) ?? undefined,
    startDate: (row.start_date as string | null) ?? undefined,
    endDate: (row.end_date as string | null) ?? undefined,
    isCurrent: Boolean(row.is_current),
    jobTitle: (row.job_title as string | null) ?? undefined,
    responsibilities: (row.responsibilities as string | null) ?? undefined,
    achievements: (row.achievements as string | null) ?? undefined,
    reasonForLeaving: (row.reason_for_leaving as string | null) ?? undefined,
    orderIndex: Number(row.order_index ?? 0),
  };
}

function mapQualification(row: Record<string, unknown>): ResumeQualification {
  return {
    id: String(row.id),
    resumeId: String(row.resume_id),
    name: String(row.name),
    issuer: (row.issuer as string | null) ?? undefined,
    acquiredAt: (row.acquired_at as string | null) ?? undefined,
    licenseNumber: (row.license_number as string | null) ?? undefined,
    expiresAt: (row.expires_at as string | null) ?? undefined,
    userQualificationId: (row.user_qualification_id as string | null) ?? undefined,
    orderIndex: Number(row.order_index ?? 0),
  };
}

function mapTraining(row: Record<string, unknown>): ResumeTraining {
  return {
    id: String(row.id),
    resumeId: String(row.resume_id),
    courseName: String(row.course_name),
    institution: (row.institution as string | null) ?? undefined,
    startDate: (row.start_date as string | null) ?? undefined,
    endDate: (row.end_date as string | null) ?? undefined,
    content: (row.content as string | null) ?? undefined,
    orderIndex: Number(row.order_index ?? 0),
  };
}

function mapSkill(row: Record<string, unknown>): ResumeSkill {
  return {
    id: String(row.id),
    resumeId: String(row.resume_id),
    name: String(row.name),
    orderIndex: Number(row.order_index ?? 0),
  };
}

function mapItem(row: Record<string, unknown>): ResumeItem {
  return {
    id: String(row.id),
    resumeId: String(row.resume_id),
    sectionType: row.section_type as ResumeItem["sectionType"],
    title: String(row.title),
    organization: (row.organization as string | null) ?? undefined,
    periodStart: (row.period_start as string | null) ?? undefined,
    periodEnd: (row.period_end as string | null) ?? undefined,
    description: (row.description as string | null) ?? undefined,
    orderIndex: Number(row.order_index ?? 0),
  };
}

export function createSupabaseResumeDetailRepository(): ResumeDetailRepository | null {
  const rawClient = createAdminSupabaseClient();
  if (!rawClient) return null;
  // TS는 nested function 안에서 closure로 잡힌 const의 null narrowing을 보존하지 않으므로 재바인딩한다.
  const client = rawClient;

  async function replaceRows<TInput, TRow>(
    table: string,
    resumeId: string,
    inputs: TInput[],
    toRow: (input: TInput, index: number) => Record<string, unknown>,
    mapRow: (row: Record<string, unknown>) => TRow,
  ): Promise<TRow[]> {
    const { error: deleteError } = await client.from(table).delete().eq("resume_id", resumeId);
    if (deleteError) throwDataSourceError(`ResumeDetailRepository.replace(${table}).delete`, deleteError);
    if (inputs.length === 0) return [];

    const { data, error } = await client
      .from(table)
      .insert(inputs.map((input, i) => ({ resume_id: resumeId, ...toRow(input, i) })))
      .select("*");
    if (error || !data) throwDataSourceError(`ResumeDetailRepository.replace(${table}).insert`, error ?? new Error("no data"));
    return (data as Record<string, unknown>[]).map(mapRow).sort((a, b) => {
      const ai = (a as { orderIndex: number }).orderIndex;
      const bi = (b as { orderIndex: number }).orderIndex;
      return ai - bi;
    });
  }

  return {
    async getDetailChildren(resumeId) {
      const [eduRes, expRes, qualRes, trainRes, skillRes, itemRes] = await Promise.all([
        client.from("resume_educations").select("*").eq("resume_id", resumeId).order("order_index"),
        client.from("resume_experiences").select("*").eq("resume_id", resumeId).order("order_index"),
        client.from("resume_qualifications").select("*").eq("resume_id", resumeId).order("order_index"),
        client.from("resume_trainings").select("*").eq("resume_id", resumeId).order("order_index"),
        client.from("resume_skills").select("*").eq("resume_id", resumeId).order("order_index"),
        client.from("resume_items").select("*").eq("resume_id", resumeId).order("order_index"),
      ]);
      return {
        educations: unwrapList("ResumeDetailRepository.getDetailChildren.educations", eduRes).map((r) =>
          mapEducation(r as Record<string, unknown>),
        ),
        experiences: unwrapList("ResumeDetailRepository.getDetailChildren.experiences", expRes).map((r) =>
          mapExperience(r as Record<string, unknown>),
        ),
        qualifications: unwrapList("ResumeDetailRepository.getDetailChildren.qualifications", qualRes).map((r) =>
          mapQualification(r as Record<string, unknown>),
        ),
        trainings: unwrapList("ResumeDetailRepository.getDetailChildren.trainings", trainRes).map((r) =>
          mapTraining(r as Record<string, unknown>),
        ),
        skills: unwrapList("ResumeDetailRepository.getDetailChildren.skills", skillRes).map((r) =>
          mapSkill(r as Record<string, unknown>),
        ),
        items: unwrapList("ResumeDetailRepository.getDetailChildren.items", itemRes).map((r) =>
          mapItem(r as Record<string, unknown>),
        ),
      };
    },
    replaceEducations: (resumeId, input) =>
      replaceRows<ResumeEducationInput, ResumeEducation>(
        "resume_educations",
        resumeId,
        input,
        (item, i) => ({
          school_name: item.schoolName,
          education_type: item.educationType,
          major: item.major,
          degree: item.degree,
          admission_date: item.admissionDate,
          graduation_date: item.graduationDate,
          graduation_status: item.graduationStatus,
          description: item.description,
          order_index: item.orderIndex ?? i,
        }),
        mapEducation,
      ),
    replaceExperiences: (resumeId, input) =>
      replaceRows<ResumeExperienceInput, ResumeExperience>(
        "resume_experiences",
        resumeId,
        input,
        (item, i) => ({
          company_name: item.companyName,
          department: item.department,
          position: item.position,
          employment_type: item.employmentType,
          start_date: item.startDate,
          end_date: item.endDate,
          is_current: item.isCurrent ?? false,
          job_title: item.jobTitle,
          responsibilities: item.responsibilities,
          achievements: item.achievements,
          reason_for_leaving: item.reasonForLeaving,
          order_index: item.orderIndex ?? i,
        }),
        mapExperience,
      ),
    replaceQualifications: (resumeId, input) =>
      replaceRows<ResumeQualificationInput, ResumeQualification>(
        "resume_qualifications",
        resumeId,
        input,
        (item, i) => ({
          name: item.name,
          issuer: item.issuer,
          acquired_at: item.acquiredAt,
          license_number: item.licenseNumber,
          expires_at: item.expiresAt,
          order_index: item.orderIndex ?? i,
        }),
        mapQualification,
      ),
    replaceTrainings: (resumeId, input) =>
      replaceRows<ResumeTrainingInput, ResumeTraining>(
        "resume_trainings",
        resumeId,
        input,
        (item, i) => ({
          course_name: item.courseName,
          institution: item.institution,
          start_date: item.startDate,
          end_date: item.endDate,
          content: item.content,
          order_index: item.orderIndex ?? i,
        }),
        mapTraining,
      ),
    replaceSkills: (resumeId, input) =>
      replaceRows<ResumeSkillInput, ResumeSkill>(
        "resume_skills",
        resumeId,
        input,
        (item, i) => ({ name: item.name, order_index: item.orderIndex ?? i }),
        mapSkill,
      ),
    replaceItems: (resumeId, input) =>
      replaceRows<ResumeItemInput, ResumeItem>(
        "resume_items",
        resumeId,
        input,
        (item, i) => ({
          section_type: item.sectionType,
          title: item.title,
          organization: item.organization,
          period_start: item.periodStart,
          period_end: item.periodEnd,
          description: item.description,
          order_index: item.orderIndex ?? i,
        }),
        mapItem,
      ),
    async setQualificationLink(resumeQualificationId, userQualificationId) {
      const { error } = await client
        .from("resume_qualifications")
        .update({ user_qualification_id: userQualificationId })
        .eq("id", resumeQualificationId);
      if (error) throwDataSourceError("ResumeDetailRepository.setQualificationLink", error);
    },
    async removeAllForResume(resumeId) {
      // resumes 삭제 시 FK on delete cascade로 자동 정리되지만, 명시적으로도 호출 가능하게 둔다.
      await Promise.all(
        ["resume_educations", "resume_experiences", "resume_qualifications", "resume_trainings", "resume_skills", "resume_items"].map(
          async (table) => {
            const { error } = await client.from(table).delete().eq("resume_id", resumeId);
            if (error) throwDataSourceError(`ResumeDetailRepository.removeAllForResume(${table})`, error);
          },
        ),
      );
    },
  };
}
