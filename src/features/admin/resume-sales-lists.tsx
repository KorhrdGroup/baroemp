import Link from "next/link";
import { formatPhone } from "@/lib/utils/phone";
import type { ResumeSalesLead, ResumeSalesLeads } from "@/services/resume-sales-lead.service";

function LeadList({
  title,
  hint,
  tone,
  leads,
}: {
  title: string;
  hint: string;
  tone: "urgent" | "warm" | "cool";
  leads: ResumeSalesLead[];
}) {
  const badge =
    tone === "urgent"
      ? "bg-rose-50 text-rose-600"
      : tone === "warm"
        ? "bg-brand-blue-50 text-brand-blue-700"
        : "bg-slate-100 text-slate-600";

  return (
    <section className="flex flex-col rounded-xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-body-2 font-semibold text-slate-900">{title}</h3>
          <span className={`rounded-md px-1.5 py-0.5 text-label-2 font-semibold ${badge}`}>{leads.length}명</span>
        </div>
        <p className="mt-1 text-label-2 text-slate-400">{hint}</p>
      </div>

      {leads.length === 0 ? (
        <p className="px-4 py-6 text-label-2 text-slate-400">해당하는 회원이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {leads.map((lead) => (
            <li key={lead.userId} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/admin/users/${lead.userId}`}
                  className="text-label-1 font-semibold text-slate-900 hover:text-brand-blue-600"
                >
                  {lead.name ?? "이름 없음"}
                </Link>
                <span className="shrink-0 text-label-2 text-slate-400">{lead.occurredAt.slice(0, 10)}</span>
              </div>
              <p className="mt-0.5 text-label-2 text-slate-600">
                {lead.reason}
                {lead.desiredJobTitle && <span className="text-slate-400"> · 희망 {lead.desiredJobTitle}</span>}
              </p>
              {(lead.phone || lead.email) && (
                <p className="mt-0.5 text-label-2 text-slate-400">
                  {lead.phone ? formatPhone(lead.phone) : lead.email}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * 이력서·자소서 활동에서 뽑은 영업 대상자 3종.
 * "지금 연락하면 반응할 확률" 순으로 왼쪽부터 배치한다.
 */
export function ResumeSalesLists({ leads }: { leads: ResumeSalesLeads }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <LeadList
        title="AI 점검 점수 낮음"
        hint="첨삭이 필요하다고 본인이 확인한 상태 — 컨설팅 제안 1순위"
        tone="urgent"
        leads={leads.lowScore}
      />
      <LeadList
        title="이력서 내보내기"
        hint="곧 지원함 — 면접 준비·기업 추천 제안 적기"
        tone="warm"
        leads={leads.exported}
      />
      <LeadList
        title="작성하다 멈춤"
        hint="완성도가 낮은 채 방치 — 이탈 방지 연락 대상"
        tone="cool"
        leads={leads.stalled}
      />
    </div>
  );
}
