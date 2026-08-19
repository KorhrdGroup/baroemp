import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Lead } from "@/types";
import {
  labelAgeGroup,
  labelDesiredStartTiming,
  labelLeadStatus,
  labelRegion,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

interface RecentLeadsTableProps {
  leads: Lead[];
  title?: string;
}

function gradeClass(grade: Lead["score"]["grade"]): string {
  switch (grade) {
    case "A":
      return "bg-red-50 text-red-600 ring-red-100";
    case "B":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "C":
      return "bg-brand-blue-50 text-brand-blue-600 ring-brand-blue-100";
    default:
      return "bg-slate-100 text-slate-500 ring-slate-200";
  }
}

export function RecentLeadsTable({ leads, title = "최근 고관심 Lead" }: RecentLeadsTableProps) {
  const sorted = [...leads].sort((a, b) => b.score.totalScore - a.score.totalScore);

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-body-2 font-bold text-slate-900">{title}</h2>
        <span className="text-label-2 text-slate-400">{sorted.length}건</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-label-2 font-semibold text-slate-500">이름</TableHead>
              <TableHead className="text-label-2 font-semibold text-slate-500">연령대</TableHead>
              <TableHead className="text-label-2 font-semibold text-slate-500">지역</TableHead>
              <TableHead className="text-label-2 font-semibold text-slate-500">관심직업</TableHead>
              <TableHead className="text-label-2 font-semibold text-slate-500">취업희망시기</TableHead>
              <TableHead className="text-label-2 font-semibold text-slate-500">최근행동</TableHead>
              <TableHead className="text-label-2 font-semibold text-slate-500">Lead Score</TableHead>
              <TableHead className="text-label-2 font-semibold text-slate-500">추천상품</TableHead>
              <TableHead className="text-label-2 font-semibold text-slate-500">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((lead) => (
              <TableRow key={lead.id} className="text-label-1">
                <TableCell className="font-semibold text-slate-800">{lead.name}</TableCell>
                <TableCell className="text-slate-600">{labelAgeGroup(lead.ageGroup)}</TableCell>
                <TableCell className="text-slate-600">{labelRegion(lead.region)}</TableCell>
                <TableCell className="text-slate-700">{lead.interestedJobLabel ?? "-"}</TableCell>
                <TableCell className="text-slate-600">
                  {labelDesiredStartTiming(lead.desiredStartTiming)}
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-slate-600">
                  {lead.recentActionLabel}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "rounded-md border-0 px-2 py-0.5 text-label-2 font-bold ring-1",
                        gradeClass(lead.score.grade),
                      )}
                    >
                      {lead.score.grade}
                    </Badge>
                    <span className="font-semibold text-slate-800">{lead.score.totalScore}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-slate-600">
                  {lead.recommendedContentTitle ?? "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="rounded-md text-label-2 font-medium text-slate-600"
                  >
                    {labelLeadStatus(lead.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
