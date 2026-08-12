import type { Consultation } from "@/types";

export const mockConsultations: Consultation[] = [
  {
    id: "consult-001",
    userId: "user-1001",
    channel: "phone",
    status: "scheduled",
    requestedTopic: "요양보호사 자격 취득 및 취업 연계 상담",
    preferredAt: "2026-08-12T05:00:00.000Z",
    scheduledAt: "2026-08-12T05:00:00.000Z",
    assignedConsultantName: "정하늘 컨설턴트",
    memo: "경력단절 6개월, 즉시 취업 희망",
    createdAt: "2026-08-10T08:10:00.000Z",
    updatedAt: "2026-08-10T09:00:00.000Z",
  },
  {
    id: "consult-002",
    userId: "user-1004",
    channel: "video",
    status: "requested",
    requestedTopic: "배송직 취업 및 실무교육 연계 문의",
    preferredAt: "2026-08-13T02:00:00.000Z",
    createdAt: "2026-08-10T02:05:00.000Z",
    updatedAt: "2026-08-10T02:05:00.000Z",
  },
];
