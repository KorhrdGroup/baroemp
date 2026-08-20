import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { listContents } from "@/services/content.service";
import { getDataSourceMode } from "@/lib/data/mode";

export default async function AdminContentsPage() {
  const contents = await listContents();
  const mode = getDataSourceMode();

  return (
    <AdminPageShell
      title="콘텐츠 관리"
      description={`Career Content Catalog CRUD · 모드: ${mode}`}
      icon={BookOpen}
    >
      <div className="mb-3 flex justify-end">
        <Button className="bg-brand-blue-400 hover:bg-brand-blue-600" asChild>
          <Link href="/admin/contents/new">+ 신규 등록</Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-label-2">제목</TableHead>
                <TableHead className="text-label-2">유형</TableHead>
                <TableHead className="text-label-2">유료</TableHead>
                <TableHead className="text-label-2">가격</TableHead>
                <TableHead className="text-label-2">태그</TableHead>
                <TableHead className="text-label-2">Rule</TableHead>
                <TableHead className="text-label-2">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contents.map((content) => (
                <TableRow key={content.id} className="text-label-1">
                  <TableCell className="font-semibold">
                    <Link
                      href={`/admin/contents/${content.id}`}
                      className="text-brand-blue-600 hover:underline"
                    >
                      {content.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-md text-label-2">
                      {content.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{content.isPaid ? "유료" : "무료"}</TableCell>
                  <TableCell>
                    {content.price > 0 ? `${content.price.toLocaleString()}원` : "-"}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-slate-500">
                    {content.tags.join(", ")}
                  </TableCell>
                  <TableCell>{content.recommendationRuleRows?.length ?? 0}개</TableCell>
                  <TableCell>{content.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminPageShell>
  );
}
