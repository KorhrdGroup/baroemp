"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExperienceBankItem } from "@/types";
import {
  createExperienceBankItemAction,
  deleteExperienceBankItemAction,
} from "./experience-bank-actions";

const EMPTY_FORM = { title: "", situation: "", task: "", action: "", result: "" };

/**
 * 경험뱅크 관리 화면. STAR 용어를 그대로 노출하지 않고 쉬운 질문으로 입력받는다 (스펙 35번).
 * 여기서 저장한 경험은 자기소개서 여러 문항에서 AI 초안 생성 시 재사용할 수 있다.
 */
export function ExperienceBankManager({ initialItems }: { initialItems: ExperienceBankItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    if (!form.title.trim()) {
      setError("경험 제목을 입력해주세요.");
      return;
    }
    startSave(async () => {
      try {
        setError(null);
        const created = await createExperienceBankItemAction(form);
        setItems((prev) => [created, ...prev]);
        setForm(EMPTY_FORM);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 경험을 삭제하시겠습니까?")) return;
    await deleteExperienceBankItemAction(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border-0 ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-body-2">새 경험 추가하기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-label-2 text-slate-500">이 경험을 뭐라고 부르면 좋을까요? (예: 고객 민원 해결)</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label className="text-label-2 text-slate-500">어떤 상황이었나요?</Label>
            <Textarea className="mt-1" rows={2} value={form.situation} onChange={(e) => setForm((f) => ({ ...f, situation: e.target.value }))} />
          </div>
          <div>
            <Label className="text-label-2 text-slate-500">어떤 역할/과제를 맡았나요?</Label>
            <Textarea className="mt-1" rows={2} value={form.task} onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))} />
          </div>
          <div>
            <Label className="text-label-2 text-slate-500">무엇을 했나요?</Label>
            <Textarea className="mt-1" rows={2} value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))} />
          </div>
          <div>
            <Label className="text-label-2 text-slate-500">결과는 어땠나요? (숫자가 없어도 괜찮아요)</Label>
            <Textarea className="mt-1" rows={2} value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))} />
          </div>
          {error && <p className="text-label-1 text-rose-500">{error}</p>}
          <Button onClick={handleAdd} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            경험 저장하기
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-label-1 text-slate-400">아직 저장된 경험이 없어요. 위에서 첫 경험을 추가해보세요.</p>}
        {items.map((item) => (
          <Card key={item.id} className="rounded-xl border-0 ring-1 ring-border">
            <CardContent className="flex items-start justify-between gap-3 pt-6">
              <div className="space-y-1 text-label-1 text-slate-600">
                <p className="text-body-2 font-semibold text-slate-900">{item.title}</p>
                {item.situation && <p>상황: {item.situation}</p>}
                {item.task && <p>역할: {item.task}</p>}
                {item.action && <p>행동: {item.action}</p>}
                {item.result && <p>결과: {item.result}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                <Trash2 className="size-4 text-slate-400" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
