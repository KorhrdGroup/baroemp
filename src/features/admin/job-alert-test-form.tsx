"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inspectJobAlertTemplateAction, sendTestJobAlertAction } from "./job-alert-test-actions";

export function JobAlertTestForm({ configured }: { configured: boolean }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [inspect, setInspect] = useState<Awaited<ReturnType<typeof inspectJobAlertTemplateAction>> | null>(null);
  const [inspecting, startInspect] = useTransition();

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label-1 font-semibold text-slate-900">테스트 발송</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {configured ? "알리고 연결됨" : "알리고 키 미설정 · 기록만 남김"}
        </span>
      </div>
      <p className="mt-1 text-label-2 text-slate-500">서울 최신 공고 1건으로 입력한 번호에 실제 템플릿 그대로 보냅니다.</p>
      <div className="mt-3 flex gap-2">
        <Input
          className="h-10 max-w-60 bg-white"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
        />
        <Button
          className="h-10 bg-brand-blue-600 hover:bg-brand-blue-700"
          disabled={pending || !phone.trim()}
          onClick={() => {
            setMessage(null);
            start(async () => {
              const r = await sendTestJobAlertAction(phone);
              setMessage(r.message);
            });
          }}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          보내기
        </Button>
      </div>
      {message && <p className="mt-2 text-label-1 text-slate-600">{message}</p>}

      {/* 카카오가 "템플릿 불일치"로 거절할 때, 등록 원본과 우리 발송 내용을 나란히 보고 어디가 다른지 찾는다. */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={inspecting || !configured}
            onClick={() => {
              setInspect(null);
              startInspect(async () => setInspect(await inspectJobAlertTemplateAction()));
            }}
          >
            {inspecting ? <Loader2 className="size-4 animate-spin" /> : null}
            등록 템플릿과 대조
          </Button>
          {inspect && (
            <span className={`text-label-1 font-semibold ${inspect.ok ? "text-emerald-700" : "text-rose-600"}`}>{inspect.message}</span>
          )}
        </div>
        {inspect && inspect.diffs && inspect.diffs.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-label-1 text-rose-700">
            {inspect.diffs.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        {inspect?.registeredContent && (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-label-2 font-semibold text-slate-500">알리고에 등록된 원본</p>
              <pre className="max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-[12px] leading-relaxed whitespace-pre-wrap text-slate-700">{inspect.registeredContent}</pre>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">{inspect.registeredButtons}</pre>
            </div>
            <div>
              <p className="mb-1 text-label-2 font-semibold text-slate-500">우리가 보내는 내용</p>
              <pre className="max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-[12px] leading-relaxed whitespace-pre-wrap text-slate-700">{inspect.ourContent}</pre>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">{inspect.ourButtons}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
