import { activityEventLogger } from "@/lib/activity/event-logger";
import { isProductionEnv, isSupabaseMode } from "@/lib/data/mode";
import { DataSourceError, throwDataSourceError } from "@/lib/data/errors";
import {
  getAssessmentResultRepository,
  getAssessmentSessionRepository,
  getJobInterestRepository,
  getMatchResultRepository,
} from "@/lib/repositories";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { promoteAssessmentQualifications } from "@/services/career-profile-merge.service";

export interface IdentityLinkSummary {
  linkedSessions: number;
  linkedResults: number;
  linkedJobInterests: number;
  linkedMatchResults: number;
  linkedActivityEvents: number;
}

const EMPTY_SUMMARY: IdentityLinkSummary = {
  linkedSessions: 0,
  linkedResults: 0,
  linkedJobInterests: 0,
  linkedMatchResults: 0,
  linkedActivityEvents: 0,
};

/**
 * Supabase Mode: `link_anonymous_career_data` RPC(Postgres 함수, 0018 migration)를 호출한다.
 * 하나의 함수 안에서 모든 UPDATE를 수행하므로 DB 트랜잭션으로 원자적으로 처리된다
 * (중간에 실패하면 전체 롤백되어 "반쪽만 이동"하는 상태가 생기지 않는다).
 */
async function linkViaSupabaseRpc(anonymousId: string, userId: string): Promise<IdentityLinkSummary> {
  const client = createAdminSupabaseClient();
  if (!client) {
    const message =
      "[linkAnonymousCareerDataToUser] Supabase Mode이지만 Admin 클라이언트를 생성할 수 없습니다.";
    if (isProductionEnv()) throw new DataSourceError(message);
    console.warn(`${message} (개발환경이므로 Repository 기반 병합으로 폴백합니다)`);
    return linkViaRepositories(anonymousId, userId);
  }

  const { data, error } = await client.rpc("link_anonymous_career_data", {
    p_anonymous_id: anonymousId,
    p_user_id: userId,
  });
  if (error) throwDataSourceError("linkAnonymousCareerDataToUser.rpc", error);

  const row = (data ?? {}) as Record<string, number>;
  return {
    linkedSessions: row.linked_sessions ?? 0,
    linkedResults: row.linked_results ?? 0,
    linkedJobInterests: row.linked_job_interests ?? 0,
    linkedMatchResults: row.linked_match_results ?? 0,
    linkedActivityEvents: row.linked_activity_events ?? 0,
  };
}

/**
 * Mock Mode(또는 Supabase RPC를 쓸 수 없는 개발환경) 전용 폴백.
 * 모든 저장소가 같은 Node 프로세스의 메모리를 공유하므로 실질적으로는 원자적이지만,
 * 진짜 여러 커넥션/서버에 걸친 트랜잭션은 아니다. 실패 항목이 있으면 에러로 알린다.
 */
async function linkViaRepositories(anonymousId: string, userId: string): Promise<IdentityLinkSummary> {
  const results = await Promise.allSettled([
    getAssessmentSessionRepository().linkAnonymousToUser(anonymousId, userId),
    getAssessmentResultRepository().linkAnonymousToUser(anonymousId, userId),
    getJobInterestRepository().linkAnonymousToUser(anonymousId, userId),
    getMatchResultRepository().linkAnonymousToUser(anonymousId, userId),
    activityEventLogger.linkAnonymousToUser?.(anonymousId, userId) ?? Promise.resolve(0),
  ]);

  const [sessionsR, resultsR, jobInterestsR, matchResultsR, activityR] = results;
  const summary: IdentityLinkSummary = {
    linkedSessions: sessionsR.status === "fulfilled" ? sessionsR.value : 0,
    linkedResults: resultsR.status === "fulfilled" ? resultsR.value : 0,
    linkedJobInterests: jobInterestsR.status === "fulfilled" ? jobInterestsR.value : 0,
    linkedMatchResults: matchResultsR.status === "fulfilled" ? matchResultsR.value : 0,
    linkedActivityEvents: activityR.status === "fulfilled" ? activityR.value : 0,
  };

  const failures = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  if (failures.length > 0) {
    throw new Error(
      `[linkAnonymousCareerDataToUser] ${failures.length}개 항목 병합 실패: ${failures
        .map((f) => String(f.reason))
        .join(", ")}. 성공한 항목: ${JSON.stringify(summary)}`,
    );
  }
  return summary;
}

/**
 * 비회원(anonymous_id) 상태로 쌓인 검사 세션/결과/관심직업/매칭결과/활동이벤트를
 * 회원가입·로그인 시점의 userId로 귀속시킨다.
 *
 * assessment_answers는 session_id를 통해 세션에 종속되므로(직접 user_id 컬럼이 없음)
 * 세션 소유자만 바꾸면 답변도 자연스럽게 해당 사용자 소유가 된다. 별도 처리가 필요 없다.
 *
 * 실제 인증(Signup/Login) 플로우는 다음 STEP에서 연결되며,
 * 이 함수는 그 시점에 바로 호출할 수 있도록 지금 완성해 둔다.
 */
export async function linkAnonymousCareerDataToUser(
  anonymousId: string,
  userId: string,
): Promise<IdentityLinkSummary> {
  if (!anonymousId) return EMPTY_SUMMARY;

  const summary = isSupabaseMode()
    ? await linkViaSupabaseRpc(anonymousId, userId)
    : await linkViaRepositories(anonymousId, userId);

  /*
   * 비회원으로 진단을 마친 뒤 가입한 경우, 진단에서 답한 보유 자격은 이 시점에야 회원 소유가 된다.
   * 승격은 보조 기능이므로 실패해도 링크 결과 자체는 유지한다.
   */
  if (summary.linkedResults > 0) {
    try {
      const results = await getAssessmentResultRepository().findAll({ userId });
      const heldNames = results.flatMap((r) => r.extractedProfile.heldQualifications ?? []);
      await promoteAssessmentQualifications(userId, heldNames);
    } catch (err) {
      console.error("[linkAnonymousCareerDataToUser] 진단 보유 자격 승격 실패:", err);
    }
  }

  await activityEventLogger.log({
    userId,
    eventType: "anonymous_identity_linked",
    entityType: "career_profile",
    metadata: { anonymousId, ...summary },
  });

  return summary;
}
