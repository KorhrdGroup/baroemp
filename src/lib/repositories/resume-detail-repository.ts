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
import { resolveRepository } from "@/lib/data/resolve-repository";
import { createSupabaseResumeDetailRepository } from "./supabase/resume-detail.supabase-repository";

export interface ResumeDetailChildren {
  educations: ResumeEducation[];
  experiences: ResumeExperience[];
  qualifications: ResumeQualification[];
  trainings: ResumeTraining[];
  skills: ResumeSkill[];
  items: ResumeItem[];
}

/**
 * 이력서 하위 항목(학력/경력/자격/교육/스킬/기타항목) Repository.
 *
 * Resume Builder는 "폼 전체를 한번에 저장"하는 UX이므로, 개별 row CRUD 대신
 * "이 이력서의 하위 항목을 통째로 교체한다"는 replace* 메서드로 설계했다.
 * 이렇게 하면 사용자가 항목을 추가/삭제/순서변경 해도 저장 시점에 항상 최신 배열 순서(orderIndex)를
 * 그대로 반영할 수 있고, Mock/Supabase 구현 모두 단순해진다.
 */
export interface ResumeDetailRepository {
  getDetailChildren(resumeId: string): Promise<ResumeDetailChildren>;
  replaceEducations(resumeId: string, items: ResumeEducationInput[]): Promise<ResumeEducation[]>;
  replaceExperiences(resumeId: string, items: ResumeExperienceInput[]): Promise<ResumeExperience[]>;
  replaceQualifications(resumeId: string, items: ResumeQualificationInput[]): Promise<ResumeQualification[]>;
  replaceTrainings(resumeId: string, items: ResumeTrainingInput[]): Promise<ResumeTraining[]>;
  replaceSkills(resumeId: string, items: ResumeSkillInput[]): Promise<ResumeSkill[]>;
  replaceItems(resumeId: string, items: ResumeItemInput[]): Promise<ResumeItem[]>;
  /** Career DB Merge Service가 find-or-create한 user_qualification과 resume_qualifications row를 연결한다. */
  setQualificationLink(resumeQualificationId: string, userQualificationId: string): Promise<void>;
  removeAllForResume(resumeId: string): Promise<void>;
}

function createMockResumeDetailRepository(): ResumeDetailRepository {
  let educations: ResumeEducation[] = [];
  let experiences: ResumeExperience[] = [];
  let qualifications: ResumeQualification[] = [];
  let trainings: ResumeTraining[] = [];
  let skills: ResumeSkill[] = [];
  let items: ResumeItem[] = [];
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`;

  return {
    async getDetailChildren(resumeId) {
      return {
        educations: educations.filter((e) => e.resumeId === resumeId).sort((a, b) => a.orderIndex - b.orderIndex),
        experiences: experiences.filter((e) => e.resumeId === resumeId).sort((a, b) => a.orderIndex - b.orderIndex),
        qualifications: qualifications.filter((q) => q.resumeId === resumeId).sort((a, b) => a.orderIndex - b.orderIndex),
        trainings: trainings.filter((t) => t.resumeId === resumeId).sort((a, b) => a.orderIndex - b.orderIndex),
        skills: skills.filter((s) => s.resumeId === resumeId).sort((a, b) => a.orderIndex - b.orderIndex),
        items: items.filter((i) => i.resumeId === resumeId).sort((a, b) => a.orderIndex - b.orderIndex),
      };
    },
    async replaceEducations(resumeId, input) {
      const created = input.map((item, i) => ({
        id: nextId("resume-edu"),
        resumeId,
        schoolName: item.schoolName,
        educationType: item.educationType,
        major: item.major,
        degree: item.degree,
        admissionDate: item.admissionDate,
        graduationDate: item.graduationDate,
        graduationStatus: item.graduationStatus,
        description: item.description,
        orderIndex: item.orderIndex ?? i,
      }));
      educations = [...educations.filter((e) => e.resumeId !== resumeId), ...created];
      return created;
    },
    async replaceExperiences(resumeId, input) {
      const created = input.map((item, i) => ({
        id: nextId("resume-exp"),
        resumeId,
        companyName: item.companyName,
        department: item.department,
        position: item.position,
        employmentType: item.employmentType,
        startDate: item.startDate,
        endDate: item.endDate,
        isCurrent: item.isCurrent ?? false,
        jobTitle: item.jobTitle,
        responsibilities: item.responsibilities,
        achievements: item.achievements,
        reasonForLeaving: item.reasonForLeaving,
        orderIndex: item.orderIndex ?? i,
      }));
      experiences = [...experiences.filter((e) => e.resumeId !== resumeId), ...created];
      return created;
    },
    async replaceQualifications(resumeId, input) {
      const created = input.map((item, i) => ({
        id: nextId("resume-qual"),
        resumeId,
        name: item.name,
        issuer: item.issuer,
        acquiredAt: item.acquiredAt,
        licenseNumber: item.licenseNumber,
        expiresAt: item.expiresAt,
        userQualificationId: undefined,
        orderIndex: item.orderIndex ?? i,
      }));
      qualifications = [...qualifications.filter((q) => q.resumeId !== resumeId), ...created];
      return created;
    },
    async replaceTrainings(resumeId, input) {
      const created = input.map((item, i) => ({
        id: nextId("resume-training"),
        resumeId,
        courseName: item.courseName,
        institution: item.institution,
        startDate: item.startDate,
        endDate: item.endDate,
        content: item.content,
        orderIndex: item.orderIndex ?? i,
      }));
      trainings = [...trainings.filter((t) => t.resumeId !== resumeId), ...created];
      return created;
    },
    async replaceSkills(resumeId, input) {
      const created = input.map((item, i) => ({
        id: nextId("resume-skill"),
        resumeId,
        name: item.name,
        orderIndex: item.orderIndex ?? i,
      }));
      skills = [...skills.filter((s) => s.resumeId !== resumeId), ...created];
      return created;
    },
    async replaceItems(resumeId, input) {
      const created = input.map((item, i) => ({
        id: nextId("resume-item"),
        resumeId,
        sectionType: item.sectionType,
        title: item.title,
        organization: item.organization,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        description: item.description,
        orderIndex: item.orderIndex ?? i,
      }));
      items = [...items.filter((i) => i.resumeId !== resumeId), ...created];
      return created;
    },
    async setQualificationLink(resumeQualificationId, userQualificationId) {
      qualifications = qualifications.map((q) =>
        q.id === resumeQualificationId ? { ...q, userQualificationId } : q,
      );
    },
    async removeAllForResume(resumeId) {
      educations = educations.filter((e) => e.resumeId !== resumeId);
      experiences = experiences.filter((e) => e.resumeId !== resumeId);
      qualifications = qualifications.filter((q) => q.resumeId !== resumeId);
      trainings = trainings.filter((t) => t.resumeId !== resumeId);
      skills = skills.filter((s) => s.resumeId !== resumeId);
      items = items.filter((i) => i.resumeId !== resumeId);
    },
  };
}

let repository: ResumeDetailRepository | null = null;

export function getResumeDetailRepository(): ResumeDetailRepository {
  if (!repository) {
    repository = resolveRepository("ResumeDetailRepository", {
      mock: createMockResumeDetailRepository,
      supabase: createSupabaseResumeDetailRepository,
    });
  }
  return repository;
}
