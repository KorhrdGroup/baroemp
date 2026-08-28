import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getJobProvider } from "@/features/jobs/providers";

/**
 * 고용24 상세 동기화.
 *
 * 목록 API(callTp=L)로 받는 값에는 직무내용이 없다. description 은 제목 복사본이고
 * requirements/qualification_requirements 는 비어 있어서, 요건 추출기가 볼 원문이
 * 사실상 제목뿐이었다. 상세 API(callTp=D)는 공고 한 건씩 따로 불러야 하므로
 * 목록 동기화와 분리해 이어받기 가능한 배치로 돈다.
 *
 * 사용약관상 무리한 폴링을 하지 않는다. 한 번 받은 공고는 detail_fetched_at 이
 * 찍혀 다시 부르지 않고, 동시 호출 수도 낮게 잡는다.
 */

const DEFAULT_BATCH = Number(process.env.JOB_DETAIL_SYNC_BATCH ?? 300);
const DEFAULT_CONCURRENCY = Math.max(1, Number(process.env.JOB_DETAIL_SYNC_CONCURRENCY ?? 8));

export interface JobDetailSyncSummary {
  scanned: number;
  updated: number;
  notFound: number;
  errors: number;
  /** 아직 상세를 못 받은 공고가 남아 있는지. 크론이 다음 배치를 이어서 돌릴 근거. */
  hasMore: boolean;
}

interface PendingJob {
  id: string;
  external_id: string;
  raw_payload: Record<string, unknown> | null;
}

export async function syncJobDetails(
  options: { limit?: number; concurrency?: number } = {},
): Promise<JobDetailSyncSummary> {
  const empty: JobDetailSyncSummary = { scanned: 0, updated: 0, notFound: 0, errors: 0, hasMore: false };

  const client = createAdminSupabaseClient();
  const provider = getJobProvider();
  // 상세 엔드포인트가 없는 Provider(목 등)로 바뀌어 있으면 건너뛴다.
  if (!client || !provider?.fetchJobDetail) return empty;
  const fetchDetail = provider.fetchJobDetail.bind(provider);

  const limit = Math.max(1, options.limit ?? DEFAULT_BATCH);
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);

  const { data, error } = await client
    .from("jobs")
    .select("id, external_id, raw_payload")
    .is("detail_fetched_at", null)
    .eq("is_active", true)
    .not("external_id", "is", null)
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`상세 동기화 대상 조회 실패: ${error.message}`);
  const pending = (data ?? []) as PendingJob[];
  if (pending.length === 0) return empty;

  const summary: JobDetailSyncSummary = {
    scanned: pending.length,
    updated: 0,
    notFound: 0,
    errors: 0,
    hasMore: pending.length >= limit,
  };

  for (let i = 0; i < pending.length; i += concurrency) {
    const slice = pending.slice(i, i + concurrency);
    await Promise.all(
      slice.map(async (job) => {
        const fetchedAt = new Date().toISOString();
        try {
          const infoSvc = typeof job.raw_payload?.infoSvc === "string" ? job.raw_payload.infoSvc : undefined;
          const patch = await fetchDetail(job.external_id, infoSvc);

          if (!patch) {
            // 내려간 공고이거나 상세가 없는 건. 다시 붙잡지 않도록 시각만 찍는다.
            summary.notFound += 1;
            await client.from("jobs").update({ detail_fetched_at: fetchedAt }).eq("id", job.id);
            return;
          }

          await client
            .from("jobs")
            .update({
              // 빈 값이 오면 기존 값을 지우지 않는다.
              ...(patch.title ? { title: patch.title } : {}),
              ...(patch.description ? { description: patch.description } : {}),
              ...(patch.requirements ? { requirements: patch.requirements } : {}),
              ...(patch.qualificationRequirements
                ? { qualification_requirements: patch.qualificationRequirements }
                : {}),
              ...(patch.workHours ? { work_hours: patch.workHours } : {}),
              ...(patch.benefits ? { benefits: patch.benefits } : {}),
              raw_payload: { ...(job.raw_payload ?? {}), detail: patch.rawDetail },
              detail_fetched_at: fetchedAt,
            })
            .eq("id", job.id);

          summary.updated += 1;
        } catch (err) {
          // 한 건이 실패해도 배치 전체를 멈추지 않는다. detail_fetched_at 을 비워 두어
          // 다음 배치에서 다시 시도된다.
          summary.errors += 1;
          console.error(`[job-detail-sync] ${job.external_id} 실패`, err);
        }
      }),
    );
  }

  return summary;
}

/** 아직 상세를 받지 못한 활성 공고 수. 진행 상황 확인용. */
export async function countPendingJobDetails(): Promise<number> {
  const client = createAdminSupabaseClient();
  if (!client) return 0;
  const { count } = await client
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .is("detail_fetched_at", null)
    .eq("is_active", true);
  return count ?? 0;
}
