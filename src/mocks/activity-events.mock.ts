import type { ActivityEvent } from "@/types";

const baseUsers = [
  "user-1001", "user-1002", "user-1003", "user-1004", "user-1005",
  "user-1006", "user-1007", "user-1008", "user-1009", "user-1010",
  "user-1011", "user-1012", "user-1013", "user-1014", "user-1015",
  "user-1016", "user-1017", "user-1018", "user-1019", "user-1020",
];

const types = [
  "ASSESSMENT_COMPLETED",
  "JOB_VIEWED",
  "JOB_SEARCHED",
  "JOB_BOOKMARKED",
  "SUPPORT_VIEWED",
  "RESUME_REVIEWED",
  "CONTENT_VIEWED",
  "CONSULTATION_REQUESTED",
  "QUALIFICATION_INTERESTED",
  "LOGIN",
] as const;

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

export const mockActivityEvents: ActivityEvent[] = Array.from({ length: 120 }, (_, i) => {
  const userId = baseUsers[i % baseUsers.length];
  const eventType = types[i % types.length];
  return {
    id: `evt-seed-${String(i + 1).padStart(3, "0")}`,
    userId,
    eventType,
    entityType: eventType.includes("JOB")
      ? "job"
      : eventType.includes("SUPPORT")
        ? "support_program"
        : eventType.includes("CONTENT")
          ? "content"
          : eventType.includes("ASSESSMENT")
            ? "assessment"
            : undefined,
    entityId: `entity-${(i % 15) + 1}`,
    metadata: {
      jobCategory: i % 3 === 0 ? "care_worker" : i % 3 === 1 ? "social_worker" : "office_admin",
      label:
        eventType === "JOB_VIEWED"
          ? "채용공고 조회"
          : eventType === "SUPPORT_VIEWED"
            ? "지원금 상세 조회"
            : eventType === "ASSESSMENT_COMPLETED"
              ? "직업진단 완료"
              : eventType,
    },
    occurredAt: hoursAgo(i),
  };
});
