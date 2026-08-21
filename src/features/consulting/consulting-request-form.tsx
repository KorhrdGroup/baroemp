"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
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
import { trackActivityAction } from "@/features/activity/activity-actions";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";

export function ConsultingRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("");
  const [channel, setChannel] = useState("phone");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void trackActivityAction({
      anonymousId: getOrCreateAnonymousId(),
      eventType: "consultation_requested",
      entityType: "consultation",
      metadata: {
        name,
        phone,
        topic,
        channel,
        isPaid: true,
      },
    });

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-border bg-white px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="mt-5 text-title-3 font-bold text-slate-900">상담 신청이 접수되었습니다</h3>
        <p className="mt-2 max-w-md text-body-2-reading text-slate-500">
          담당 컨설턴트가 확인 후 연락드립니다. (STEP 1 Mock — 실제 저장/결제는 다음 STEP에서
          연결됩니다.)
        </p>
        <Button
          className="mt-6 bg-brand-blue-400 hover:bg-brand-blue-600"
          onClick={() => {
            setSubmitted(false);
            setName("");
            setPhone("");
            setTopic("");
          }}
        >
          다시 신청하기
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-border bg-white p-6 sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">연락처</Label>
          <Input
            id="phone"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>상담 채널</Label>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="채널 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="phone">전화 상담</SelectItem>
            <SelectItem value="video">화상 상담</SelectItem>
            <SelectItem value="in_person">방문 상담</SelectItem>
            <SelectItem value="chat">채팅 상담</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic">상담 희망 내용</Label>
        <Textarea
          id="topic"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="관심 직종, 경력, 취업 희망 시기 등을 자유롭게 적어주세요."
          className="min-h-28"
        />
      </div>

      <div className="rounded-xl bg-brand-blue-50 px-4 py-3 text-center text-label-1 text-brand-blue-700">
        1:1 취업컨설팅은 유료 서비스입니다. 상담 시작 전 결제 안내를 드립니다.
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full bg-brand-blue-400 text-body-2 font-semibold hover:bg-brand-blue-600"
      >
        상담 신청하기
      </Button>
    </form>
  );
}
