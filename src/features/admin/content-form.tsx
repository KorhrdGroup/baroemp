"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveContentAction } from "@/app/admin/actions";
import type { CareerContent } from "@/types";

const CONTENT_TYPES = [
  "LICENSE",
  "PRIVATE_CERTIFICATE",
  "JOB_TRAINING",
  "ONLINE_COURSE",
  "CONSULTING",
  "ASSESSMENT",
  "FREE_CONTENT",
  "SEMINAR",
  "SUPPORT_PROGRAM",
  "OTHER",
] as const;

interface ContentFormProps {
  content?: CareerContent;
}

export function ContentForm({ content }: ContentFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<string>(content?.type ?? "OTHER");
  const [status, setStatus] = useState<string>(content?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 rounded-xl bg-white p-6 ring-1 ring-slate-200"
      action={(formData) => {
        formData.set("type", type);
        formData.set("status", status);
        if (content?.id) formData.set("id", content.id);
        startTransition(async () => {
          const result = await saveContentAction(formData);
          if (!result.ok) {
            setError(result.message);
            return;
          }
          router.push(`/admin/contents/${result.id}`);
          router.refresh();
        });
      }}
    >
      {error && <p className="text-label-1 text-red-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" required defaultValue={content?.title} className="h-11" />
        </div>

        <div className="space-y-2">
          <Label>콘텐츠 유형</Label>
          <Select value={type} onValueChange={(v) => v && setType(v)}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>상태</Label>
          <Select value={status} onValueChange={(v) => v && setStatus(v)}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">draft</SelectItem>
              <SelectItem value="published">published</SelectItem>
              <SelectItem value="archived">archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">카테고리</Label>
          <Input id="category" name="category" defaultValue={content?.category ?? ""} className="h-11" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">가격</Label>
          <Input
            id="price"
            name="price"
            type="number"
            defaultValue={content?.price ?? 0}
            className="h-11"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="summary">짧은 설명</Label>
          <Input id="summary" name="summary" defaultValue={content?.summary ?? ""} className="h-11" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">상세 설명</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={content?.description ?? ""}
            className="min-h-28"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="externalUrl">외부 신청/안내 페이지 URL</Label>
          <Input
            id="externalUrl"
            name="externalUrl"
            type="url"
            placeholder="https://..."
            defaultValue={content?.externalUrl ?? ""}
            className="h-11"
          />
          <p className="text-label-2 text-slate-400">
            입력하면 진단 결과의 &ldquo;준비하러 가기&rdquo;와 추천 카드가 이 주소로 새 탭 연결됩니다.
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="tags">태그 (쉼표 구분)</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={content?.tags?.join(", ") ?? ""}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">추천 기본 가중치</Label>
          <Input
            id="weight"
            name="weight"
            type="number"
            defaultValue={content?.recommendationRules?.weight ?? 1}
            className="h-11"
          />
        </div>

        <div className="flex items-end gap-2 pb-1">
          <label className="flex items-center gap-2 text-label-1 text-slate-700">
            <input
              type="checkbox"
              name="isPaid"
              defaultChecked={content?.isPaid}
              className="size-4 rounded border-slate-300"
            />
            유료 콘텐츠
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-brand-blue-400 hover:bg-brand-blue-600"
        >
          {pending ? "저장 중..." : content ? "수정 저장" : "신규 등록"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/contents")}>
          목록으로
        </Button>
      </div>
    </form>
  );
}
