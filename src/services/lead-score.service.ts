import { activityEventLogger } from "@/lib/activity/event-logger";
import { calculateLeadScore } from "@/lib/leads/scoring-engine";
import { buildLeadSignalInput } from "@/lib/leads/signal-builder";
import {
  findCareerProfileByUserId,
  getAssessmentResultRepository,
  getConsultationRepository,
  getJobInterestRepository,
  getLeadRepository,
  getProfileRepository,
} from "@/lib/repositories";
import { resolvePrimaryInterest } from "./primary-interest.service";
import type { Lead, LeadScoreBreakdown } from "@/types";

/**
 * Activity 기반 Lead Score 재계산.
 * DB Trigger 대신 Application Service 에서 관리한다.
 * 검사(Assessment) 완료 시에도 이 함수가 호출되어 Career Profile + 검사 신호를 함께 반영한다.
 *
 * 기존에는 리드가 이미 존재해야만 점수를 갱신했고, 리드가 없으면 아무 것도 저장하지 않았다.
 * 이번 수정으로 리드가 없으면 새로 생성한다 (upsert) — "leads upsert" 요구사항.
 */
export async function recalculateLeadScore(userId: string): Promise<{
  breakdown: LeadScoreBreakdown;
  lead: Lead | null;
}> {
  const profile = await findCareerProfileByUserId(userId);
  const events = await activityEventLogger.getEventsByUser(userId);
  const assessmentResults = await getAssessmentResultRepository().findAll({ userId });
  const latestAssessmentResult = assessmentResults.sort((a, b) =>
    a.completedAt < b.completedAt ? 1 : -1,
  )[0];
  const jobInterests = await getJobInterestRepository().findAll({ userId });
  const consultations = await getConsultationRepository().findAll({ userId });

  const signalInput = buildLeadSignalInput({
    profile: profile ?? undefined,
    events,
    latestAssessmentResult,
    jobInterests,
  });
  const breakdown = calculateLeadScore(signalInput);

  const primaryInterest = resolvePrimaryInterest({
    jobInterests,
    latestAssessmentResult,
    careerProfile: profile ?? undefined,
    consultations,
  });

  const leadRepo = getLeadRepository();
  const leads = await leadRepo.findAll();
  const existing = leads.find((l) => l.userId === userId) ?? null;

  const scorePayload = {
    totalScore: breakdown.totalScore,
    grade: breakdown.grade,
    signals: breakdown.signals,
  };

  if (existing) {
    const updated = await leadRepo.update(existing.id, {
      score: scorePayload,
      lastActivityAt: new Date().toISOString(),
      recentActionLabel: events[0]?.eventType ?? existing.recentActionLabel,
      interestedJobLabel: primaryInterest?.label ?? existing.interestedJobLabel,
    });
    return { breakdown, lead: updated };
  }

  const profileRow = await getProfileRepository().findById(userId);
  const created = await leadRepo.create({
    userId,
    name: profileRow?.name ?? "회원",
    ageGroup: profile?.ageGroup,
    region: profile?.region,
    desiredStartTiming: profile?.desiredStartTiming,
    recentActionLabel: events[0]?.eventType ?? "",
    interestedJobLabel: primaryInterest?.label,
    status: "new",
    score: scorePayload,
    lastActivityAt: new Date().toISOString(),
  });
  return { breakdown, lead: created };
}

export function scoreBreakdownToRecord(breakdown: LeadScoreBreakdown): Record<string, number> {
  const record: Record<string, number> = {};
  for (const signal of breakdown.signals) {
    if (signal.active) record[signal.key] = signal.points;
  }
  return record;
}
