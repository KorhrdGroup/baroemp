import { BellRing } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { countJobAlertSubscribers, listRecentJobAlertLogs } from "@/services/job-alert.service";
import { formatPhone } from "@/lib/utils/phone";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-600",
  skipped: "bg-slate-100 text-slate-500",
};
const STATUS_LABEL: Record<string, string> = { sent: "발송", failed: "실패", skipped: "건너뜀" };
const CHANNEL_LABEL: Record<string, string> = { console: "기록만(알리고 미연결)", aligo_alimtalk: "알림톡", "-": "-" };

export default async function AdminJobAlertsPage() {
  const [subscribers, logs] = await Promise.all([countJobAlertSubscribers(), listRecentJobAlertLogs()]);
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter((l) => l.createdAt.startsWith(today));
  const todaySent = todayLogs.filter((l) => l.status === "sent").length;

  return (
    <AdminPageShell
      title="공고 알림"
      description="매일 10시 동의 회원에게 거주지 근처 신규 공고를 1건씩 보냅니다. 알리고 연결 전에는 발송 없이 기록만 남습니다."
      icon={BellRing}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "알림 동의 회원", value: `${subscribers}명` },
          { label: "오늘 발송", value: `${todaySent}건` },
          { label: "오늘 건너뜀/실패", value: `${todayLogs.length - todaySent}건` },
        ].map((k) => (
          <div key={k.label} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-label-2 text-slate-500">{k.label}</p>
            <p className="mt-1 text-title-3 font-bold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-label-2">일시</TableHead>
                <TableHead className="text-label-2">회원</TableHead>
                <TableHead className="text-label-2">연락처</TableHead>
                <TableHead className="text-label-2">보낸 공고</TableHead>
                <TableHead className="text-label-2">채널</TableHead>
                <TableHead className="text-label-2">상태</TableHead>
                <TableHead className="text-label-2">사유</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-slate-400">
                    아직 발송 기록이 없습니다. 매일 10시 크론이 돌면 여기에 쌓입니다.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((l) => (
                  <TableRow key={l.id} className="text-label-1">
                    <TableCell className="whitespace-nowrap text-slate-500">
                      {l.createdAt.slice(0, 10)} {l.createdAt.slice(11, 16)}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">{l.userName}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatPhone(l.phone)}</TableCell>
                    <TableCell className="max-w-80 break-keep">{l.jobTitle ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-slate-500">{CHANNEL_LABEL[l.channel] ?? l.channel}</TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_CLASS[l.status] ?? "bg-slate-100 text-slate-500")}>
                        {STATUS_LABEL[l.status] ?? l.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500">{l.reason ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminPageShell>
  );
}

export const dynamic = "force-dynamic";
