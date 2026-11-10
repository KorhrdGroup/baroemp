import { after } from "next/server";
import { syncJobsFromProvider } from "@/services/job-sync.service";

/**
 * Vercel Cron이 매일 새벽(03:00 KST) 호출하는 채용공고 전량 동기화 엔드포인트 (vercel.json crons).
 *
 * 전량(6만+건)은 서버리스 실행시간 한도 안에 한 번에 못 끝나므로 청크 체인으로 돈다:
 * 1. 요청을 받으면 즉시 202로 응답하고, after()에서 CHUNK_PAGES 만큼 동기화한다.
 * 2. 목록 끝(reachedEnd)이 아니면 다음 청크(startPage+CHUNK_PAGES)로 자기 자신을 호출한다.
 * 3. 마지막 청크만 staleBefore(사이클 시작 시각) 기준으로 내려간 공고를 비활성화한다
 *    (job-sync.service의 reachedEnd 가드 - 부분 동기화는 절대 비활성화하지 않는다).
 *
 * 인증: Vercel Cron이 CRON_SECRET 환경변수를 Authorization: Bearer로 보낸다.
 */
export const maxDuration = 300;

const CHUNK_PAGES = Number(process.env.JOB_SYNC_CRON_CHUNK_PAGES ?? 150);
const HARD_PAGE_LIMIT = 1000; // Work24 startPage 상한 - 체인 폭주 방지

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const startPage = Math.max(1, Number(url.searchParams.get("startPage") ?? 1));
  const staleBefore = url.searchParams.get("staleBefore") ?? new Date().toISOString();

  if (startPage > HARD_PAGE_LIMIT) {
    return Response.json({ error: "page limit exceeded" }, { status: 400 });
  }

  after(async () => {
    const summary = await syncJobsFromProvider({
      triggeredBy: "vercel-cron",
      startPage,
      maxPages: CHUNK_PAGES,
      pageSize: 100,
      staleBefore,
    });
    console.log(
      `[cron/sync-jobs] pages ${startPage}~: fetched=${summary.fetchedCount} new=${summary.newCount} ` +
        `updated=${summary.updatedCount} deactivated=${summary.deactivatedCount} errors=${summary.errorCount} reachedEnd=${summary.reachedEnd}`,
    );

    if (!summary.reachedEnd && !summary.errorMessage) {
      /*
        Vercel Cron 은 *.vercel.app 배포 주소로 부르는데, 그 주소는 Vercel 인증(Deployment Protection)에
        막혀 있다. request.url 로 자기 자신을 부르면 SSO 로그인 페이지로 튕겨 다음 청크가 한 번도 돌지 않았고,
        그래서 목록 끝(reachedEnd)에 못 닿아 마감 공고가 비활성화되지 않은 채 22만 건까지 쌓였다.
        다음 청크는 공개 도메인으로 부른다.
      */
      const next = new URL(url.pathname + url.search, process.env.NEXT_PUBLIC_SITE_URL ?? url.origin);
      next.searchParams.set("startPage", String(startPage + CHUNK_PAGES));
      next.searchParams.set("staleBefore", staleBefore);
      // 다음 청크 호출 - 상대편도 즉시 202를 반환하므로 이 대기는 짧다.
      // 리다이렉트를 따라가면 로그인 페이지의 200 을 성공으로 오인하므로 따라가지 않고 상태를 본다.
      const res = await fetch(next, { headers: { authorization: `Bearer ${secret}` }, redirect: "manual" });
      if (res.status !== 202) {
        console.error(`[cron/sync-jobs] 다음 청크(${next.origin}, startPage=${startPage + CHUNK_PAGES}) 호출 실패: HTTP ${res.status}`);
      }
    }
  });

  return Response.json({ accepted: true, startPage, chunkPages: CHUNK_PAGES }, { status: 202 });
}
