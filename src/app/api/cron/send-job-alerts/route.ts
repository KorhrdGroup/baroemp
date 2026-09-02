import { runDailyJobAlerts } from "@/services/job-alert.service";

/**
 * 매일 10:00 KST(01:00 UTC) Vercel Cron이 호출한다 (vercel.json crons).
 * 알림 설정에 동의한 회원에게 거주지 근처 신규 채용공고 1건을 보낸다.
 * 인증: Vercel Cron이 CRON_SECRET 을 Authorization: Bearer 로 보낸다.
 * ?dryRun=1 이면 대상만 세고 발송·기록은 하지 않는다.
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  try {
    const summary = await runDailyJobAlerts({ dryRun });
    return Response.json({ ok: true, dryRun, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("[cron:send-job-alerts] failed", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
