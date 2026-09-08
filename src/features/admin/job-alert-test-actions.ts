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
    settingsUrl: `${site}/mypage`,
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

/**
 * 알리고에 등록된 템플릿 원본과 우리가 보내는 본문·버튼을 대조한다.
 * 카카오가 "메시지가 템플릿과 일치하지 않음"으로 거절할 때 어디가 다른지 바로 본다.
 */
export async function inspectJobAlertTemplateAction(): Promise<{
  ok: boolean;
  message: string;
  registeredContent?: string;
  registeredButtons?: string;
  ourContent?: string;
  ourButtons?: string;
  diffs?: string[];
}> {
  const user = await requireSessionUser();
  if (!isAdminRole(user.role)) return { ok: false, message: "관리자만 사용할 수 있습니다." };
  const { fetchAligoTemplate, buildJobAlertBody, buildJobAlertButtons } = await import("@/lib/alimtalk");
  const tpl = await fetchAligoTemplate();
  if ("error" in tpl) return { ok: false, message: tpl.error };

  const sample = { memberName: "#{회원명}", jobTitle: "#{공고명}", companyName: "#{기관명}", regionLabel: "#{근무지역}", deadlineLabel: "#{마감일}", detailUrl: "https://www.job24.co.kr/jobs/#{공고ID}", settingsUrl: "https://www.job24.co.kr/mypage" };
  const ourContent = buildJobAlertBody(sample);
  const ourButtons = buildJobAlertButtons(sample);

  const norm = (s: string) => s.replace(/\r\n/g, "\n");
  const diffs: string[] = [];
  const a = norm(tpl.content).split("\n");
  const b = norm(ourContent).split("\n");
  if (a.length !== b.length) diffs.push(`줄 수 다름: 등록 ${a.length}줄 / 우리 ${b.length}줄`);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? "") !== (b[i] ?? "")) diffs.push(`${i + 1}번째 줄 다름 → 등록: "${a[i] ?? "(없음)"}" / 우리: "${b[i] ?? "(없음)"}"`);
  }
  if (tpl.buttons.length !== ourButtons.length) diffs.push(`버튼 수 다름: 등록 ${tpl.buttons.length}개 / 우리 ${ourButtons.length}개`);
  tpl.buttons.forEach((rb, i) => {
    const ob = ourButtons[i];
    if (!ob) return;
    if (rb.name !== ob.name) diffs.push(`버튼 ${i + 1} 이름 다름 → 등록: "${rb.name}" / 우리: "${ob.name}"`);
    if (rb.linkType !== ob.linkType) diffs.push(`버튼 ${i + 1} 타입 다름 → 등록: ${rb.linkType} / 우리: ${ob.linkType}`);
  });

  return {
    ok: diffs.length === 0,
    message: diffs.length === 0 ? "등록 템플릿과 본문·버튼이 일치합니다." : `${diffs.length}곳이 다릅니다.`,
    registeredContent: tpl.content,
    registeredButtons: JSON.stringify(tpl.buttons, null, 2),
    ourContent,
    ourButtons: JSON.stringify(ourButtons, null, 2),
    diffs,
  };
}
