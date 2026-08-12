import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentForm } from "@/features/admin/content-form";
import { PotentialCustomersPanel } from "@/features/admin/potential-customers-panel";
import { analyzePotentialCustomers, getContentById, listContentRules } from "@/services/content.service";

export default async function AdminContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const content = await getContentById(id);
  if (!content) notFound();

  const potential = await analyzePotentialCustomers(id);
  const rules = listContentRules(id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/contents" className="text-[12px] text-brand-blue-600 hover:underline">
            ← 콘텐츠 목록
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{content.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{content.type}</Badge>
            <Badge variant="secondary">{content.status}</Badge>
            <Badge className="bg-brand-blue-50 text-brand-blue-600 border-0">
              {content.isPaid ? "유료" : "무료"}
            </Badge>
          </div>
        </div>
        <Button variant="outline" asChild>
          <a href="#edit">수정 폼으로</a>
        </Button>
      </div>

      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="text-[14px] font-bold">추천 Rule</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          content_recommendation_rules — 관리자 설정형 (하드코딩 금지)
        </p>
        <ul className="mt-3 space-y-2 text-[13px]">
          {rules.length === 0 && <li className="text-slate-500">등록된 Rule 없음 (레거시 객체 규칙 사용)</li>}
          {rules.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <Badge variant="outline">{rule.field}</Badge>
              <span>{rule.operator}</span>
              <code className="text-[12px] text-slate-600">{JSON.stringify(rule.value)}</code>
              <span className="font-semibold text-brand-blue-600">+{rule.weight}</span>
            </li>
          ))}
        </ul>
      </div>

      {potential && <PotentialCustomersPanel summary={potential} />}

      <div id="edit">
        <h2 className="mb-3 text-[15px] font-bold text-slate-900">콘텐츠 수정</h2>
        <ContentForm content={content} />
      </div>
    </div>
  );
}
