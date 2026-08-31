import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { labelAgeGroup, labelEmploymentStatus, labelRegion } from "@/lib/labels";
import type { AgeGroup, EmploymentStatus, Region } from "@/types";

/**
 * 영업 리드 뷰 (어드민 전용).
 * 회원의 진단 데이터(직업진단 추천·지원금 진단 답변·보유 자격)를 영업 관점 한 줄로 합친다.
 * 외부(한평생오피스)로 보내지 않고 바로취업 어드민에서 직접 조회하는 용도다.
 */
export interface SalesLeadRow {
  userId: string;
  name: string;
  phone?: string;
  joinedAt: string;
  marketingConsent: boolean;
  ageLabel?: string;
  regionLabel?: string;
  employmentLabel?: string;
  /** 직업진단 1위 직업명 (점수) */
  topOccupation?: string;
  /** 영업 제안 과정 = 1위 직업의 필요 자격 중 미보유 자격 */
  proposedCourse?: string;
  insurance?: "yes" | "no" | "unknown";
  incomeBand?: "low" | "middle" | "high" | "unknown";
  trainingWillingness?: number;
  /** 영업 태그: 훈련의향높음 / 고용보험없음 / 국민취업지원후보 등 */
  tags: string[];
  /**
   * 전달 등급. 1이 가장 먼저 컨택할 리드다.
   * 1순위: 훈련의향 4점 이상 + 자격 필수 직업이 1위 + 해당 자격 미보유 → "자격증 따면 취업" 스토리 완성
   * 2순위: 고용보험 없음 + 소득 낮음 → 국민취업지원 Ⅰ유형 안내로 시작 (내일배움카드로 교육비 부담 해소)
   * 3: 그 외 일반 리드
   */
  priority: 1 | 2 | 3;
  /** 첫 통화에서 꺼낼 상담 각도. 등급 판정 근거를 영업 멘트 형태로 풀어둔다. */
  salesAngle?: string;
}

export const PRIORITY_LABELS: Record<SalesLeadRow["priority"], string> = {
  1: "1순위",
  2: "2순위",
  3: "일반",
};

const INSURANCE_LABELS = { yes: "있음", no: "없음", unknown: "모름" } as const;
const INCOME_LABELS = { low: "낮음", middle: "보통", high: "높음", unknown: "모름" } as const;

export function labelInsurance(v?: SalesLeadRow["insurance"]): string {
  return v ? INSURANCE_LABELS[v] : "-";
}
export function labelIncomeBand(v?: SalesLeadRow["incomeBand"]): string {
  return v ? INCOME_LABELS[v] : "-";
}

export async function getSalesLeads(limit = 200): Promise<SalesLeadRow[]> {
  const admin = createAdminSupabaseClient();
  if (!admin) return [];

  const [profilesRes, careerRes, supportRes, matchRes, occRes, qualRes] = await Promise.all([
    admin.from("profiles").select("id, name, phone, created_at, marketing_consent, role").order("created_at", { ascending: false }).limit(limit * 2),
    admin.from("career_profiles").select("user_id, age_group, preferred_region, employment_status"),
    admin.from("support_assessment_sessions").select("user_id, answers, created_at").not("user_id", "is", null).order("created_at", { ascending: false }),
    admin.from("match_results").select("user_id, target_id, score, created_at").eq("target_type", "occupation").not("user_id", "is", null).order("score", { ascending: false }),
    admin.from("occupations").select("id, name, required_qualifications").eq("status", "published"),
    admin.from("user_qualifications").select("user_id, name"),
  ]);

  const careers = new Map((careerRes.data ?? []).map((c) => [c.user_id as string, c]));
  const occById = new Map((occRes.data ?? []).map((o) => [o.id as string, o]));
  const heldByUser = new Map<string, string[]>();
  for (const q of qualRes.data ?? []) {
    const list = heldByUser.get(q.user_id as string) ?? [];
    list.push(String(q.name));
    heldByUser.set(q.user_id as string, list);
  }
  // 사용자별 최신 지원금 진단 답변
  const supportByUser = new Map<string, Record<string, unknown>>();
  for (const s of supportRes.data ?? []) {
    if (!supportByUser.has(s.user_id as string)) supportByUser.set(s.user_id as string, (s.answers as Record<string, unknown>) ?? {});
  }
  // 사용자별 최고점 직업 추천
  const topOccByUser = new Map<string, { targetId: string; score: number }>();
  for (const m of matchRes.data ?? []) {
    if (!topOccByUser.has(m.user_id as string)) topOccByUser.set(m.user_id as string, { targetId: m.target_id as string, score: Number(m.score) });
  }

  const rows: SalesLeadRow[] = [];
  for (const p of profilesRes.data ?? []) {
    if (p.role !== "USER") continue; // 관리자 계정 제외
    const career = careers.get(p.id as string);
    const support = supportByUser.get(p.id as string);
    const top = topOccByUser.get(p.id as string);
    const occ = top ? occById.get(top.targetId) : undefined;
    const held = heldByUser.get(p.id as string) ?? [];

    const requiredQuals = ((occ?.required_qualifications as string[]) ?? []).map((q) => q.replace(/\(우대\)/g, ""));
    const missingQuals = requiredQuals.filter((rq) => !held.some((h) => rq.includes(h) || h.includes(rq)));

    const insurance = support?.employmentInsuranceHistory as SalesLeadRow["insurance"] | undefined;
    const incomeBand = support?.incomeBand as SalesLeadRow["incomeBand"] | undefined;
    const trainingWillingness =
      typeof support?.trainingWillingness === "number" ? (support.trainingWillingness as number) : undefined;

    const tags: string[] = [];
    if ((trainingWillingness ?? 0) >= 4) tags.push("훈련의향 높음");
    if (insurance === "no") tags.push("고용보험 없음");
    if (insurance === "no" && incomeBand === "low") tags.push("국민취업지원 Ⅰ유형 후보");
    if (missingQuals.length > 0 && occ) tags.push("자격 취득 제안 가능");
    if (p.marketing_consent) tags.push("마케팅 동의");

    // 전달 등급. 두 조건을 다 만족하면 자격 스토리(1순위)로 열고 국취Ⅰ은 교육비 해소 멘트로 붙인다.
    const qualStory = (trainingWillingness ?? 0) >= 4 && Boolean(occ) && missingQuals.length > 0;
    const kuaCandidate = insurance === "no" && incomeBand === "low";
    let priority: SalesLeadRow["priority"] = 3;
    let salesAngle: string | undefined;
    if (qualStory) {
      priority = 1;
      salesAngle = `${missingQuals[0]} 취득 → ${occ!.name} 취업 제안`;
      if (kuaCandidate) salesAngle += " (교육비는 국취Ⅰ·내일배움카드로 해소)";
    } else if (kuaCandidate) {
      priority = 2;
      salesAngle = "국민취업지원 Ⅰ유형 안내로 시작, 내일배움카드로 교육비 부담 해소";
    }

    rows.push({
      userId: String(p.id),
      name: String(p.name ?? "이름 미입력"),
      phone: (p.phone as string) ?? undefined,
      joinedAt: String(p.created_at).slice(0, 10),
      marketingConsent: Boolean(p.marketing_consent),
      ageLabel: career?.age_group ? labelAgeGroup(career.age_group as AgeGroup) : undefined,
      regionLabel: career?.preferred_region ? labelRegion(career.preferred_region as Region) : undefined,
      employmentLabel: career?.employment_status ? labelEmploymentStatus(career.employment_status as EmploymentStatus) : undefined,
      topOccupation: occ ? `${occ.name} (${top!.score}점)` : undefined,
      proposedCourse: missingQuals[0],
      insurance,
      incomeBand,
      trainingWillingness,
      tags,
      priority,
      salesAngle,
    });
    if (rows.length >= limit) break;
  }

  // 영업 우선순위: 전달 등급 → 태그 많은 순 → 최근 가입 순
  return rows.sort(
    (a, b) => a.priority - b.priority || b.tags.length - a.tags.length || (a.joinedAt < b.joinedAt ? 1 : -1),
  );
}
