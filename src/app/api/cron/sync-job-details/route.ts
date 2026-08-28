import { after } from "next/server";
import { countPendingJobDetails, syncJobDetails } from "@/services/job-detail-sync.service";

/**
 * 고용24 상세(callTp=D) 동기화 엔드포인트.
 *
 * 목록 동기화(/api/cron/sync-jobs)와 나눠 둔다. 목록은 페이지 단위로 한 번에 100건씩
 * 받지만 상세는 공고 하나에 호출 하나라, 6만+건을 한 실행에 끝낼 수 없다.
 * 그래서 sync-jobs 와 같은 방식으로 배치를 이어 붙인다:
 *  1. 요청을 받으면 즉시 202로 응답하고 after()에서 한 배치를 처리한다.
 *  2. 남은 공고가 있으면 자기 자신을 다시 호출한다.
 *  3. 이미 받은 공고는 detail_fetched_at 이 찍혀 대상에서 빠지므로 이어받기가 된다.
 *
 * 사용약관상 무리한 폴링을 피해야 하므로 하루 한 번 크론으로만 돈다.
 * 인증은 sync-jobs 와 같은 CRON_SECRET.
 */
export const maxDuration = 300;

const MAX_CHAINS = Number(process.env.JOB_DETAIL_SYNC_MAX_CHAINS ?? 200);

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const chain = Math.max(0, Number(url.searchParams.get("chain") ?? 0));
  // 체인 폭주 방지. 한 사이클에서 못 끝내면 다음 날 크론이 이어받는다.
  if (chain > MAX_CHAINS) {
    return Response.json({ error: "chain limit exceeded", chain }, { status: 400 });
  }

  // 운영·점검용으로 한 배치 크기를 줄여 부를 수 있게 한다(미지정 시 기본값).
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;

  after(async () => {
    try {
      const summary = await syncJobDetails({ limit });
      console.log(
        `[cron/sync-job-details] chain=${chain} scanned=${summary.scanned} updated=${summary.updated} ` +
          `notFound=${summary.notFound} errors=${summary.errors} hasMore=${summary.hasMore}`,
      );

      if (summary.hasMore) {
        const next = new URL(url);
        next.searchParams.set("chain", String(chain + 1));
        await fetch(next, { headers: { authorization: `Bearer ${secret}` } });
      } else {
        console.log(`[cron/sync-job-details] 완료. 남은 건수=${await countPendingJobDetails()}`);
      }
    } catch (error) {
      console.error("[cron/sync-job-details] 배치 실패", error);
    }
  });

  return Response.json({ accepted: true, chain }, { status: 202 });
}
