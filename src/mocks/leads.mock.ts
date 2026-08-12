import type { AgeGroup, Lead, Region } from "@/types";
import { calculateLeadScore, type LeadSignalInput } from "@/lib/leads/scoring-engine";
import { mockAdminUsers } from "./users.mock";
import { mockCareerProfiles } from "./career-profiles.mock";

const interestByIndex = [
  "요양보호사",
  "시설관리·미화",
  "사회복지사",
  "배송·운전직",
  "사무·행정직",
  "병원동행",
  "사회복지사",
  "요양보호사",
  "돌봄",
  "사무·행정직",
  "시설관리·미화",
  "요양보호사",
  "상담원",
  "경비·보안",
  "사회복지사",
  "사무·행정직",
  "요양보호사",
  "시설관리·미화",
  "사회복지사",
  "배송·운전직",
];

function signalsForScore(score: number): LeadSignalInput {
  return {
    wants_job_within_3_months: score >= 40,
    repeated_same_category_job_views: score >= 50,
    resume_review_completed: score >= 60,
    support_program_checked: score >= 30,
    missing_qualification_with_course_available: score >= 45,
    consultation_requested: score >= 70,
    active_within_7_days: score >= 10,
  };
}

export const mockLeads: Lead[] = mockAdminUsers.map((user, i) => {
  const scoreValue = user.leadScore ?? 20;
  const breakdown = calculateLeadScore(signalsForScore(scoreValue));
  const profile = mockCareerProfiles.find((p) => p.userId === user.id);
  return {
    id: `lead-${user.id.replace("user-", "")}`,
    userId: user.id,
    name: user.name,
    ageGroup: profile?.ageGroup as AgeGroup | undefined,
    region: profile?.region as Region | undefined,
    interestedJobLabel: interestByIndex[i] ?? "재취업",
    desiredStartTiming:
      scoreValue >= 70 ? "immediately" : scoreValue >= 40 ? "within_3_months" : "undecided",
    recentActionLabel:
      scoreValue >= 70
        ? "1:1 취업컨설팅 상담신청"
        : scoreValue >= 50
          ? "동일 직종 채용공고 반복 조회"
          : "직업 상세 조회",
    recommendedContentTitle:
      interestByIndex[i]?.includes("요양")
        ? "요양보호사 자격 취득과정"
        : interestByIndex[i]?.includes("사회")
          ? "사회복지사 2급 학점은행 과정"
          : "중장년 재취업 성공전략 세미나",
    status: scoreValue >= 70 ? "contacting" : scoreValue >= 40 ? "new" : "closed",
    score: breakdown,
    lastActivityAt: new Date(Date.now() - i * 3600_000).toISOString(),
    createdAt: `${user.joinedAt}T00:00:00.000Z`,
  };
});
