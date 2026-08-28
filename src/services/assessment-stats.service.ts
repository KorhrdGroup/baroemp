import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { AGE_GROUP_LABELS } from "@/lib/labels";

/**
 * 통계 > 직업진단 탭이 쓰는 집계.
 *
 * 기존 assessment-analytics.service는 세션·결과를 findAll()로 전량 끌어와 세고
 * 연령대를 mock 사용자 배열에서 가져온다. 실데이터로는 못 쓰므로 여기서 새로 집계한다.
 * 세는 일은 전부 SQL(RPC)에서 끝낸다.
 */

/** 추천 직업 순위에 보여줄 개수. 꼬리는 1건씩이라 늘려도 읽히지 않는다. */
const RECOMMENDATION_TOP_N = 10;

/** 진단 분류. 진행 순서대로 두어야 어디서 멈췄는지가 순서대로 읽힌다. */
const SECTIONS: { key: string; label: string }[] = [
  { key: "basic", label: "기본 정보" },
  { key: "career", label: "경력·역량" },
  { key: "personality", label: "성향" },
  { key: "condition", label: "근무조건" },
  { key: "readiness", label: "취업 준비도" },
];

export interface SectionProgress {
  label: string;
  /** 이 분류에서 멈춘 미완료 세션 수. */
  droppedCount: number;
}

export interface RecommendationRow {
  occupationName: string;
  count: number;
  avgScore: number;
  /** 이 직업을 1순위로 받은 사람 중 가장 많은 연령대. 없으면 비회원뿐이라는 뜻이다. */
  topAgeGroup: string | null;
}

export interface QuestionDropoffRow {
  orderIndex: number;
  questionText: string;
  section: string;
  answeredCount: number;
  /** 바로 앞 문항 대비 남은 비율. 100이면 아무도 안 떨어졌다는 뜻이다. */
  retentionPercent: number;
  /**
   * 취업 프로필에 값이 있으면 건너뛰는 문항.
   * 응답 수가 적은 것이 이탈이 아니라 생략이므로 낙폭 판단에서 뺀다.
   */
  isSkippable: boolean;
}

export interface AssessmentStats {
  startedCount: number;
  completedCount: number;
  completionRatePercent: number;
  avgMinutes: number;
  medianMinutes: number;
  durationSampleCount: number;
  sectionProgress: SectionProgress[];
  recommendations: RecommendationRow[];
  questionDropoff: QuestionDropoffRow[];
  /** 남은 비율이 가장 크게 떨어진 문항. 손볼 곳이 하나라면 여기다. */
  worstDropoff: QuestionDropoffRow | null;
  error?: string;
}

const EMPTY: AssessmentStats = {
  startedCount: 0,
  completedCount: 0,
  completionRatePercent: 0,
  avgMinutes: 0,
  medianMinutes: 0,
  durationSampleCount: 0,
  sectionProgress: [],
  recommendations: [],
  questionDropoff: [],
  worstDropoff: null,
};

type ProgressRow = { status: string; section: string; session_count: number };
type DurationRow = { avg_minutes: number | null; median_minutes: number | null; sample_count: number };
type RecoRow = {
  occupation_name: string;
  reco_count: number;
  avg_score: number | null;
  top_age_group: string | null;
};
type DropoffRow = {
  order_index: number;
  question_text: string;
  section: string;
  answered_count: number;
  is_skippable: boolean;
};

export async function getAssessmentStats(days: number): Promise<AssessmentStats> {
  const client = createAdminSupabaseClient();
  if (!client) return { ...EMPTY, error: "Supabase 관리자 키가 설정되지 않았습니다." };

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const [progress, duration, recommendations, dropoff] = await Promise.all([
    client.rpc("admin_assessment_progress", { p_since: sinceIso }),
    client.rpc("admin_assessment_duration", { p_since: sinceIso }),
    client.rpc("admin_assessment_recommendations", { p_since: sinceIso }),
    client.rpc("admin_assessment_question_dropoff", { p_since: sinceIso }),
  ]);

  if (progress.error) return { ...EMPTY, error: progress.error.message };

  const progressRows = (progress.data ?? []) as ProgressRow[];
  const startedCount = progressRows.reduce((s, r) => s + Number(r.session_count), 0);
  const completedCount = progressRows
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + Number(r.session_count), 0);

  // 완료한 세션은 마지막 분류에 머물러 있으므로, 이탈로 세면 마지막 분류가 부풀려진다.
  const unfinished = progressRows.filter((r) => r.status !== "completed");
  const sectionProgress = SECTIONS.map((section) => ({
    label: section.label,
    droppedCount: unfinished
      .filter((r) => r.section === section.key)
      .reduce((s, r) => s + Number(r.session_count), 0),
  }));

  const durationRow = ((duration.data ?? []) as DurationRow[])[0];

  const recoRows = ((recommendations.data ?? []) as RecoRow[]).slice(0, RECOMMENDATION_TOP_N).map((r) => ({
    occupationName: r.occupation_name,
    count: Number(r.reco_count),
    avgScore: Number(r.avg_score ?? 0),
    topAgeGroup: r.top_age_group ? (AGE_GROUP_LABELS[r.top_age_group as never] ?? r.top_age_group) : null,
  }));

  const dropoffRows = (dropoff.data ?? []) as DropoffRow[];
  /*
   * 남은 비율은 "바로 앞 문항" 대비로 잰다.
   * 건너뛸 수 있는 문항은 응답 수가 적은 게 이탈이 아니므로, 그 문항 자체도 판단에서 빼고
   * 다음 문항의 기준선도 그 앞의 정상 문항으로 잡는다. 그러지 않으면 생략 뒤 문항이
   * 갑자기 200%가 되어 낙폭 순위가 뒤집힌다.
   */
  let baseline = 0;
  const questionDropoff: QuestionDropoffRow[] = dropoffRows.map((row) => {
    const answeredCount = Number(row.answered_count);
    const previous = baseline || answeredCount;
    if (!row.is_skippable) baseline = answeredCount;
    return {
      orderIndex: row.order_index,
      questionText: row.question_text,
      section: row.section,
      answeredCount,
      retentionPercent: previous > 0 ? Math.round((answeredCount / previous) * 100) : 100,
      isSkippable: row.is_skippable,
    };
  });

  // 표본이 한 자릿수면 한 명만 나가도 큰 낙폭으로 보인다. 그럴 땐 지목하지 않는다.
  const candidates = questionDropoff.slice(1).filter((row) => !row.isSkippable);
  const worstDropoff =
    candidates.length > 0 && startedCount >= 10
      ? candidates.reduce((worst, row) => (row.retentionPercent < worst.retentionPercent ? row : worst))
      : null;

  return {
    startedCount,
    completedCount,
    completionRatePercent: startedCount > 0 ? Math.round((completedCount / startedCount) * 100) : 0,
    avgMinutes: Number(durationRow?.avg_minutes ?? 0),
    medianMinutes: Number(durationRow?.median_minutes ?? 0),
    durationSampleCount: Number(durationRow?.sample_count ?? 0),
    sectionProgress,
    recommendations: recoRows,
    questionDropoff,
    worstDropoff: worstDropoff && worstDropoff.retentionPercent < 100 ? worstDropoff : null,
  };
}
