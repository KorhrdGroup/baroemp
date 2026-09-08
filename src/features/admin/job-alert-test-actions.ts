"use server";

import { requireSessionUser, isAdminRole } from "@/lib/auth/session";
import { getAlimtalkProvider, isAlimtalkConfigured } from "@/lib/alimtalk";
import { normalizePhone, isValidKoreanPhone } from "@/lib/utils/phone";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * 어드민 테스트 발송. 실제 최신 공고 1건으로 지정한 번호에 알림톡을 보낸다.
 * 알리고 키를 넣은 직후 템플릿·발신프로필·버튼이 맞는지 한 번에 확인하는 용도.
 */
export async function sendTestJobAlertAction(phoneRaw: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireSessionUser();
  if (!isAdminRole(user.role)) return { ok: false, message: "관리자만 사용할 수 있습니다." };
  if (!isValidKoreanPhone(phoneRaw)) return { ok: false, message: "휴대전화번호 형식을 확인해주세요." };
  const phone = normalizePhone(phoneRaw)!;

  const admin = createAdminSupabaseClient();
  if (!admin) return { ok: false, message: "저장소 설정이 없습니다." };
  const { data: job } = await admin
    .from("jobs")
    .select("id, title, company_name, region_sigungu, apply_deadline")
    .eq("is_active", true)
    .eq("region", "seoul")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!job) return { ok: false, message: "테스트에 쓸 공고가 없습니다." };

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.job24.co.kr").replace(/\/$/, "");
  const result = await getAlimtalkProvider().sendJobAlert({
    phone,
    memberName: user.name ?? "관리자",
    jobId: String(job.id),
    jobTitle: String(job.title),
    companyName: String(job.company_name),
    regionLabel: ["서울", job.region_sigungu].filter(Boolean).join(" "),
    deadlineLabel: job.apply_deadline ? String(job.apply_deadline).slice(0, 10) : "상시채용",
    detailUrl: `${site}/jobs/${job.id}`,
    settingsUrl: `${site}/mypage#job-alerts`,
  });

  await admin.from("job_alert_logs").insert({
    user_id: user.id,
    job_id: job.id,
    channel: result.channel,
    status: result.ok ? "sent" : "failed",
    reason: result.ok ? "관리자 테스트 발송" : result.error,
    template_code: result.templateCode,
    payload: { phone, jobTitle: job.title, test: true },
  });

  if (!isAlimtalkConfigured()) {
    return { ok: true, message: "알리고 키가 없어 실제 발송 없이 기록만 남겼습니다. 키를 넣고 재배포하면 이 버튼으로 실발송을 확인할 수 있어요." };
  }
  return result.ok
    ? { ok: true, message: `${phoneRaw} 로 알림톡을 보냈습니다. 카카오톡을 확인해주세요.` }
    : { ok: false, message: `발송 실패: ${result.error ?? "알 수 없는 오류"}` };
}
