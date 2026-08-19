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
import { mockConsultations } from "@/mocks/consultations.mock";

export default function AdminConsultationsPage() {
  return (
    <AdminPageShell
      title="상담관리"
      description="1:1 취업컨설팅 상담 요청 현황입니다."
      icon={MessageSquare}
    >
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-label-2">상담ID</TableHead>
                <TableHead className="text-label-2">회원ID</TableHead>
                <TableHead className="text-label-2">채널</TableHead>
                <TableHead className="text-label-2">상태</TableHead>
                <TableHead className="text-label-2">희망일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockConsultations.map((item) => (
                <TableRow key={item.id} className="text-label-1">
                  <TableCell className="font-semibold">{item.id}</TableCell>
                  <TableCell className="text-slate-500">{item.userId}</TableCell>
                  <TableCell>{item.channel}</TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell className="text-slate-500">
                    {item.preferredAt ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminPageShell>
  );
}
