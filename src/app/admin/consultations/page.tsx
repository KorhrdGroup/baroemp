import { MessageSquare } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import {
  CONSULTATION_CHANNEL_LABELS,
  getConsultationRequests,
} from "@/services/consultation-requests.service";
import { formatPhone } from "@/lib/utils/phone";

function formatRequestedAt(iso: string): string {
  // "2026-09-01 14:03" 꼴. 신청 순서 파악이 목적이라 초 단위까지는 필요 없다.
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export default async function AdminConsultationsPage() {
  const requests = await getConsultationRequests();

  return (
    <AdminPageShell
      title="취업 컨설팅"
      description="1:1 취업컨설팅 신청 현황입니다. 최근 신청이 위에 오며, 연락처로 컨택 후 일정을 조율하세요."
      icon={MessageSquare}
    >
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-label-2">신청일시</TableHead>
                <TableHead className="text-label-2">이름</TableHead>
                <TableHead className="text-label-2">연락처</TableHead>
                <TableHead className="text-label-2">희망 채널</TableHead>
                <TableHead className="text-label-2">상담 주제</TableHead>
                <TableHead className="text-label-2">회원 여부</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-slate-400">
                    아직 신청이 없습니다. 컨설팅 신청이 접수되면 여기에 쌓입니다.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id} className="text-label-1">
                    <TableCell className="whitespace-nowrap text-slate-500">
                      {formatRequestedAt(req.requestedAt)}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">{req.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatPhone(req.phone)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {req.channel ? (CONSULTATION_CHANNEL_LABELS[req.channel] ?? req.channel) : "-"}
                    </TableCell>
                    <TableCell className="max-w-80 break-keep text-slate-600">{req.topic ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-slate-500">
                      {req.userId ? `회원${req.memberName ? ` (${req.memberName})` : ""}` : "비회원"}
                    </TableCell>
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
