"use client";

import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TemplateOption {
  id: string;
  name: string;
}

/**
 * 편집 화면 상단에서 양식을 바꾸는 선택기.
 * 양식 선택을 별도 Step으로 두지 않고 작성 화면 안에서 바로 바꿀 수 있게 한다.
 */
export function TemplateSelect({
  label = "양식",
  templates,
  value,
  onChange,
  pending,
  className,
}: {
  label?: string;
  templates: TemplateOption[];
  value?: string;
  onChange: (templateId: string) => void;
  pending?: boolean;
  className?: string;
}) {
  if (templates.length === 0) return null;

  return (
    <div className={className}>
      <Label className="text-label-2 text-slate-400">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Select value={value} onValueChange={onChange} disabled={pending}>
          <SelectTrigger className="h-9 w-full sm:w-56">
            <SelectValue placeholder="양식 선택" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pending && <Loader2 className="size-4 animate-spin text-slate-400" />}
      </div>
    </div>
  );
}
