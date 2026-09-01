import { activityEventLogger } from "@/lib/activity/event-logger";
import { getResumeRepository } from "@/lib/repositories";
import { listAdminUsersPaged } from "./admin-user-list.service";
import type { ActivityEvent } from "@/types";

/** 영업 담당자가 바로 연락할 수 있도록, 사람 + 근거 + 시점만 담는다. 이력서 원문은 절대 담지 않는다. */
export interface ResumeSalesLead {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  /** 이 리스트에 뽑힌 근거 (예: "AI 점검 62점", "완성도 40%") */
  reason: string;
  /** 근거가 된 활동 시각 */
  occurredAt: string;
  resumeTitle?: string;
  desiredJobTitle?: string;
}

export interface ResumeSalesLeads {
  /** ① AI 점검 점수가 낮은 회원 - 첨삭·컨설팅 제안 대상 */
  lowScore: ResumeSalesLead[];
  /** ② 이력서를 내보낸 회원 - 곧 지원함, 면접·기업추천 제안 적기 */
  exported: ResumeSalesLead[];
  /** ③ 작성하다 멈춘 회원 - 이탈 방지 연락 대상 */
  stalled: ResumeSalesLead[];
}

/** 이 점수 미만이면 첨삭 도움이 필요하다고 본다. */
const LOW_SCORE_THRESHOLD = 70;
/** 완성도가 이 값 미만이면 "작성하다 멈춤"으로 본다. */
const STALLED_COMPLETENESS = 70;
/** 마지막 수정 후 이 기간이 지나면 멈춘 것으로 본다. */
const STALLED_DAYS = 3;
const LIST_LIMIT = 20;

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * 이력서·자소서 활동에서 영업이 바로 쓸 수 있는 대상자 3종을 뽑는다.
 *
 * 우선순위는 "지금 연락하면 반응할 확률" 순이다.
 * ① 점수가 낮게 나온 사람(도움이 필요하다고 스스로 확인함)
 * ② 이력서를 내려받은 사람(지원 직전)
 * ③ 쓰다 만 사람(이탈 직전)
 */
export async function getResumeSalesLeads(): Promise<ResumeSalesLeads> {
  const [events, resumes, profiles] = await Promise.all([
    activityEventLogger.getRecentEvents(3000),
    getResumeRepository().findAll({}),
    // ProfileRepository에는 목록 조회가 없어, 관리자 회원목록 서비스를 그대로 재사용한다.
    listAdminUsersPaged({ page: 1, pageSize: 500 }),
  ]);

  const profileById = new Map(profiles.items.map((p) => [p.id, p]));
  const resumesByUser = new Map<string, (typeof resumes)[number][]>();
  for (const r of resumes) {
    const list = resumesByUser.get(r.userId) ?? [];
    list.push(r);
    resumesByUser.set(r.userId, list);
  }

  function primaryResume(userId: string) {
    const list = resumesByUser.get(userId) ?? [];
    return list.find((r) => r.isPrimary) ?? list[0];
  }

  function toLead(userId: string, reason: string, occurredAt: string): ResumeSalesLead {
    const profile = profileById.get(userId);
    const resume = primaryResume(userId);
    return {
      userId,
      name: profile?.name,
      email: profile?.email,
      phone: profile?.phone,
      reason,
      occurredAt,
      resumeTitle: resume?.title,
      desiredJobTitle: resume?.desiredJobTitle,
    };
  }

  /** 회원당 가장 최근 1건만 남긴다 (같은 사람이 목록을 채우지 않도록). */
  function dedupeByUser(leads: ResumeSalesLead[]): ResumeSalesLead[] {
    const byUser = new Map<string, ResumeSalesLead>();
    for (const lead of leads) {
      const prev = byUser.get(lead.userId);
      if (!prev || prev.occurredAt < lead.occurredAt) byUser.set(lead.userId, lead);
    }
    return [...byUser.values()].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)).slice(0, LIST_LIMIT);
  }

  const withUser = (e: ActivityEvent): e is ActivityEvent & { userId: string } => Boolean(e.userId);

  // ① AI 점검 점수가 낮은 회원 - 점수는 이벤트 metadata.score 에 저장돼 있다.
  const lowScore = dedupeByUser(
    events
      .filter(withUser)
      .filter((e) => e.eventType === "resume_ai_reviewed" || e.eventType === "cover_letter_ai_reviewed")
      .map((e) => ({ e, score: toNumber(e.metadata?.score) }))
      .filter((x): x is { e: ActivityEvent & { userId: string }; score: number } =>
        x.score !== undefined && x.score < LOW_SCORE_THRESHOLD,
      )
      .map(({ e, score }) => toLead(e.userId, `AI 점검 ${score}점`, e.occurredAt)),
  );

  // ② 이력서를 내보낸 회원
  const exported = dedupeByUser(
    events
      .filter(withUser)
      .filter((e) => e.eventType === "resume_exported")
      .map((e) => toLead(e.userId, "이력서 내보내기", e.occurredAt)),
  );

  // ③ 작성하다 멈춘 회원 - 완성도가 낮은데 최근 수정이 없는 이력서
  const staleBefore = new Date(Date.now() - STALLED_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const stalled = dedupeByUser(
    resumes
      .filter((r) => r.completeness < STALLED_COMPLETENESS && r.updatedAt < staleBefore)
      .map((r) => toLead(r.userId, `완성도 ${r.completeness}%`, r.updatedAt)),
  );

  return { lowScore, exported, stalled };
}
