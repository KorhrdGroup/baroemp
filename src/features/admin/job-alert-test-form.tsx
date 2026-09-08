"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendTestJobAlertAction } from "./job-alert-test-actions";

export function JobAlertTestForm({ configured }: { configured: boolean }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
    </div>
  );
}
