import type { Resume, ResumeTemplate } from "@/types";

/**
 * STEP 7: Resume Builder Mock 데이터.
 * Mock Mode(DATA_SOURCE_MODE=mock)에서도 /resume, /admin/resumes가 빈 화면이 아니라
 * 실제 데모가 가능하도록 최소 1건의 샘플을 제공한다.
 */
export const mockResumeTemplates: ResumeTemplate[] = [
  {
    id: "tpl-standard",
    code: "STANDARD",
    name: "한평생 표준 이력서",
    description: "일반 취업에 가장 범용적으로 사용하는 표준 이력서입니다.",
    targetType: "general",
    sections: ["BASIC_INFO", "SUMMARY", "EXPERIENCE", "EDUCATION", "QUALIFICATION", "SKILLS", "TRAINING", "PROJECT", "ACTIVITY"],
    status: "active",
    orderIndex: 1,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "tpl-experienced",
    code: "EXPERIENCED",
    name: "경력직 이력서",
    description: "경력요약/담당업무/성과 중심으로 구성된 경력직 전용 이력서입니다.",
    targetType: "experienced",
    sections: ["BASIC_INFO", "SUMMARY", "SKILLS", "EXPERIENCE", "QUALIFICATION", "EDUCATION", "PROJECT"],
    status: "active",
    orderIndex: 2,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "tpl-midlife",
    code: "MIDLIFE",
    name: "중장년 재취업 이력서",
    description: "기존 경력 활용과 직무전환, 장기근무 가능성을 강조하는 중장년 재취업 이력서입니다.",
    targetType: "midlife",
    sections: ["BASIC_INFO", "SUMMARY", "SKILLS", "EXPERIENCE", "ACTIVITY", "QUALIFICATION", "EDUCATION"],
    status: "active",
    orderIndex: 3,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "tpl-care-welfare",
    code: "CARE_WELFARE",
    name: "복지·돌봄 직무 이력서",
    description: "사회복지, 재가복지, 요양, 지역아동센터 등 돌봄 직무 지원에 특화된 이력서입니다.",
    targetType: "care_welfare",
    sections: ["BASIC_INFO", "SUMMARY", "QUALIFICATION", "SKILLS", "EXPERIENCE", "TRAINING", "EDUCATION", "ACTIVITY"],
    status: "active",
    orderIndex: 4,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
  },
];

export const mockResumes: Resume[] = [
  {
    id: "resume-001",
    userId: "user-1005",
    templateId: "tpl-standard",
    title: "한은지_이력서_2026",
    summary: "사무·고객응대 경력 8년, 사회복지 분야로 직무전환을 준비하는 지원자",
    desiredJobTitle: "사회복지사",
    desiredRegion: "seoul",
    status: "draft",
    isPrimary: true,
    version: 1,
    completeness: 60,
    name: "한은지",
    email: "demo@example.com",
    phone: "010-0000-0000",
    createdAt: "2026-08-06T00:00:00.000Z",
    updatedAt: "2026-08-07T00:00:00.000Z",
  },
];
