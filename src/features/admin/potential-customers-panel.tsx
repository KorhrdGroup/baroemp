import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PotentialCustomerSummary } from "@/types";
import { cn } from "@/lib/utils";

function gradeClass(grade: string): string {
  if (grade === "A") return "bg-red-50 text-red-600";
  if (grade === "B") return "bg-amber-50 text-amber-700";
  if (grade === "C") return "bg-brand-blue-50 text-brand-blue-600";
  return "bg-slate-100 text-slate-500";
}

export function PotentialCustomersPanel({ summary }: { summary: PotentialCustomerSummary }) {
  return (
    <div className="space-y-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div>
        <h2 className="text-[15px] font-bold text-slate-900">잠재고객 분석</h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Content Recommendation Rules 기반 Matching Engine 결과 (USER ← CONTENT)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["총 잠재고객", summary.total],
          ["A 추천", summary.gradeA],
          ["B 추천", summary.gradeB],
          ["C 추천", summary.gradeC],
          ["D 추천", summary.gradeD],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg bg-slate-50 px-3 py-3">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead>이름</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>추천 이유</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.customers.map((c) => (
              <TableRow key={c.userId} className="text-[13px]">
                <TableCell className="font-semibold">
                  <a href={`/admin/users/${c.userId}`} className="text-brand-blue-600 hover:underline">
                    {c.name}
                  </a>
                </TableCell>
                <TableCell>
                  <Badge className={cn("border-0", gradeClass(c.grade))}>{c.grade}</Badge>
                </TableCell>
                <TableCell className="font-semibold">{c.score}</TableCell>
                <TableCell className="max-w-[320px] text-slate-500">
                  {c.reasons
                    .slice(0, 3)
                    .map((r) => `${r.label}(+${r.score})`)
                    .join(", ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
