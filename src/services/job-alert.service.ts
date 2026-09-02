import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAlimtalkProvider } from "@/lib/alimtalk";
import { labelRegion } from "@/lib/labels";
import { toJobCategoryPatterns } from "@/lib/jobs/job-category-groups";
import { normalizePhone } from "@/lib/utils/phone";
import type { Region } from "@/types";

/**
 * 거주지 근처 신규 채용공고 알림.
 *
 * 원칙
 * - 알림 설정에서 직접 동의(enabled + consented_at)한 회원에게만 보낸다.
 * - 회원당 하루 1건. 여러 건을 매일 쏘면 카카오가 광고성으로 재분류한다.
 * - 같은 공고는 두 번 보내지 않는다(job_alert_logs 의 sent 유니크 인덱스).
 * - 발송 채널은 lib/alimtalk 이 정한다. 알리고 키가 없으면 콘솔 채널로 기록만 남는다.
 */
export interface JobAlertSettings {
  enabled: boolean;
  region?: string;
  regionSigungu?: string;
  jobCategories: string[];
  consentedAt?: string;
  lastSentAt?: string;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.job24.co.kr").replace(/\/$/, "");

/** 신규로 볼 공고의 창. 동기화가 새벽 3시, 발송이 10시라 하루치보다 조금 넉넉히 본다. */
const NEW_JOB_WINDOW_HOURS = 30;

export async function getJobAlertSettings(userId: string): Promise<JobAlertSettings> {
  const admin = createAdminSupabaseClient();
  if (!admin) return { enabled: false, jobCategories: [] };
  const { data } = await admin
    .from("job_alert_settings")
    .select("enabled, region, region_sigungu, job_categories, consented_at, last_sent_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { enabled: false, jobCategories: [] };
  return {
    enabled: Boolean(data.enabled),
    region: (data.region as string | null) ?? undefined,
    regionSigungu: (data.region_sigungu as string | null) ?? undefined,
    jobCategories: (data.job_categories as string[] | null) ?? [],
    consentedAt: (data.consented_at as string | null) ?? undefined,
    lastSentAt: (data.last_sent_at as string | null) ?? undefined,
  };
}

export async function saveJobAlertSettings(
  userId: string,
  input: { enabled: boolean; region?: string; regionSigungu?: string; jobCategories: string[] },
): Promise<void> {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("저장소 설정이 없습니다.");
  const existing = await getJobAlertSettings(userId);
  // 동의 시각은 '켜는 순간'에만 찍고, 켜져 있는 동안 다른 설정을 바꿔도 유지한다.
  const consentedAt = input.enabled ? (existing.consentedAt ?? new Date().toISOString()) : null;
  const { error } = await admin.from("job_alert_settings").upsert(
    {
      user_id: userId,
      enabled: input.enabled,
      region: input.region || null,
      region_sigungu: input.regionSigungu || null,
      job_categories: input.jobCategories,
      consented_at: consentedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

/** 지역별 시군구 목록. 공고가 실제로 있는 시군구만 보여준다. */
export async function listSigunguForRegion(region: string): Promise<string[]> {
  const admin = createAdminSupabaseClient();
  if (!admin || !region) return [];
  const { data } = await admin
    .from("jobs")
    .select("region_sigungu")
    .eq("region", region)
    .eq("is_active", true)
    .not("region_sigungu", "is", null)
    .limit(1000);
  const set = new Set((data ?? []).map((r) => String(r.region_sigungu)));
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

interface JobRow {
  id: string;
  title: string;
  company_name: string;
  region: string;
  region_sigungu: string | null;
  job_category: string | null;
  apply_deadline: string | null;
  created_at: string;
}

function matchesCategory(job: JobRow, patterns: string[]): boolean {
  if (patterns.length === 0) return true;
  const code = job.job_category ?? "";
  return patterns.some((p) => code.startsWith(p));
}

export interface DailyJobAlertSummary {
  candidates: number;
  sent: number;
  skipped: number;
  failed: number;
  channel: string;
}

/**
 * 매일 10시(KST) 크론이 호출한다. 동의한 회원마다 새 공고 1건을 골라 보낸다.
 * dryRun 이면 고르기까지만 하고 발송·기록은 하지 않는다 (어드민 미리보기용).
 */
export async function runDailyJobAlerts(options: { dryRun?: boolean } = {}): Promise<DailyJobAlertSummary> {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("저장소 설정이 없습니다.");
  const provider = getAlimtalkProvider();
  const summary: DailyJobAlertSummary = { candidates: 0, sent: 0, skipped: 0, failed: 0, channel: "-" };

  const { data: settings } = await admin
    .from("job_alert_settings")
    .select("user_id, region, region_sigungu, job_categories, consented_at")
    .eq("enabled", true)
    .not("consented_at", "is", null)
    .not("region", "is", null);
  const targets = settings ?? [];
  summary.candidates = targets.length;
  if (targets.length === 0) return summary;

  const userIds = targets.map((t) => String(t.user_id));
  const [{ data: profiles }, { data: sentLogs }] = await Promise.all([
    admin.from("profiles").select("id, name, phone").in("id", userIds),
    admin.from("job_alert_logs").select("user_id, job_id").in("user_id", userIds).eq("status", "sent"),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [String(p.id), p]));
  const sentJobsByUser = new Map<string, Set<string>>();
  for (const l of sentLogs ?? []) {
    const set = sentJobsByUser.get(String(l.user_id)) ?? new Set<string>();
    if (l.job_id) set.add(String(l.job_id));
    sentJobsByUser.set(String(l.user_id), set);
  }

  const since = new Date(Date.now() - NEW_JOB_WINDOW_HOURS * 3600 * 1000).toISOString();
  // 지역별로 한 번만 조회해 회원들끼리 나눠 쓴다.
  const jobsByRegion = new Map<string, JobRow[]>();
  async function jobsFor(region: string): Promise<JobRow[]> {
    const cached = jobsByRegion.get(region);
    if (cached) return cached;
    const { data } = await admin!
      .from("jobs")
      .select("id, title, company_name, region, region_sigungu, job_category, apply_deadline, created_at")
      .eq("region", region)
      .eq("is_active", true)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300);
    const rows = (data ?? []) as JobRow[];
    jobsByRegion.set(region, rows);
    return rows;
  }

  const today = new Date().toISOString().slice(0, 10);
  const logs: Record<string, unknown>[] = [];

  for (const t of targets) {
    const userId = String(t.user_id);
    const profile = profileById.get(userId);
    const phone = normalizePhone((profile?.phone as string | null) ?? undefined);
    const alreadySent = sentJobsByUser.get(userId) ?? new Set<string>();
    const patterns = toJobCategoryPatterns((t.job_categories as string[] | null) ?? []);

    const pool = (await jobsFor(String(t.region))).filter((j) => !alreadySent.has(j.id) && matchesCategory(j, patterns));
    // 시군구가 맞는 공고를 먼저, 없으면 같은 시도 안에서 최신 공고.
    const sigungu = (t.region_sigungu as string | null) ?? null;
    const pick = (sigungu && pool.find((j) => j.region_sigungu === sigungu)) || pool[0];

    if (!phone) {
      summary.skipped += 1;
      logs.push({ user_id: userId, channel: "-", status: "skipped", reason: "연락처 없음" });
      continue;
    }
    if (!pick) {
      summary.skipped += 1;
      logs.push({ user_id: userId, channel: "-", status: "skipped", reason: "조건에 맞는 신규 공고 없음" });
      continue;
    }
    if (options.dryRun) {
      summary.sent += 1;
      continue;
    }

    const payload = {
      memberName: String(profile?.name ?? "회원"),
      jobId: pick.id,
      jobTitle: pick.title,
      companyName: pick.company_name,
      regionLabel: [labelRegion(pick.region as Region), pick.region_sigungu].filter(Boolean).join(" "),
      deadlineLabel: pick.apply_deadline ? pick.apply_deadline.slice(0, 10) : "상시채용",
      detailUrl: `${SITE_URL}/jobs/${pick.id}`,
      settingsUrl: `${SITE_URL}/mypage#job-alerts`,
    };
    const result = await provider.sendJobAlert({ phone, ...payload });
    summary.channel = result.channel;
    if (result.ok) summary.sent += 1;
    else summary.failed += 1;
    logs.push({
      user_id: userId,
      job_id: pick.id,
      channel: result.channel,
      status: result.ok ? "sent" : "failed",
      reason: result.error ?? null,
      template_code: result.templateCode,
      payload: { ...payload, phone, date: today },
    });
    if (result.ok) {
      await admin.from("job_alert_settings").update({ last_sent_at: new Date().toISOString() }).eq("user_id", userId);
    }
  }

  if (!options.dryRun && logs.length > 0) {
    await admin.from("job_alert_logs").insert(logs);
  }
  return summary;
}

/** 어드민용: 최근 발송 기록. */
export interface JobAlertLogRow {
  id: string;
  createdAt: string;
  userName: string;
  phone?: string;
  jobTitle?: string;
  channel: string;
  status: string;
  reason?: string;
}

export async function listRecentJobAlertLogs(limit = 200): Promise<JobAlertLogRow[]> {
  const admin = createAdminSupabaseClient();
  if (!admin) return [];
  const { data } = await admin
    .from("job_alert_logs")
    .select("id, user_id, channel, status, reason, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, name").in("id", userIds)
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [String(p.id), String(p.name ?? "")]));
  return rows.map((r) => {
    const payload = (r.payload as Record<string, unknown> | null) ?? {};
    return {
      id: String(r.id),
      createdAt: String(r.created_at),
      userName: nameById.get(String(r.user_id)) || "(탈퇴/미상)",
      phone: typeof payload.phone === "string" ? payload.phone : undefined,
      jobTitle: typeof payload.jobTitle === "string" ? payload.jobTitle : undefined,
      channel: String(r.channel),
      status: String(r.status),
      reason: (r.reason as string | null) ?? undefined,
    };
  });
}

export async function countJobAlertSubscribers(): Promise<number> {
  const admin = createAdminSupabaseClient();
  if (!admin) return 0;
  const { count } = await admin
    .from("job_alert_settings")
    .select("user_id", { count: "exact", head: true })
    .eq("enabled", true);
  return count ?? 0;
}
