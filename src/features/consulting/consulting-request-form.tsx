"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
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
      <div className="flex flex-col items-center rounded-card bg-white px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-baro-blue-50 text-baro-blue">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="mt-5 text-title-3 font-extrabold text-slate-900">상담 신청이 접수되었습니다</h3>
        <p className="mt-2 max-w-md text-body-2-reading font-medium text-slate-600">
          담당 컨설턴트가 확인 후 남겨주신 연락처로 연락드립니다.
        </p>
        <Button
          className="mt-6 h-12 rounded-xl bg-atomic-blue-600 px-6 font-bold text-white"
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
      className="space-y-5 rounded-card bg-white p-6 sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-body-3">이름</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="h-12 rounded-xl border-slate-300 bg-white text-body-2 font-medium md:text-body-2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-body-3">연락처</Label>
          <Input
            id="phone"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="h-12 rounded-xl border-slate-300 bg-white text-body-2 font-medium md:text-body-2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-body-3">상담 채널</Label>
        <NativeSelect className="h-12 rounded-xl border-slate-300 bg-white text-body-2 font-medium md:text-body-2" value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="phone">전화 상담</option>
          <option value="video">화상 상담</option>
          <option value="in_person">방문 상담</option>
          <option value="chat">채팅 상담</option>
        </NativeSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic" className="text-body-3">상담 희망 내용</Label>
        <Textarea
          id="topic"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="관심 직종, 경력, 취업 희망 시기 등을 자유롭게 적어주세요."
          className="min-h-28 rounded-xl border-slate-300 bg-white text-body-2 font-medium md:text-body-2"
        />
      </div>

      {/* 폼 안의 다른 컨트롤과 같은 rounded-xl(12px). 입력칸을 rounded-xl 로 맞췄으니 이 안내도 따라간다. */}
      {/* 두 줄로 접힐 때 "결제 / 안내" 처럼 붙어야 할 말이 갈렸다. 낱말을 지키고 줄 길이를 고르게 나눈다. */}
        <div className="rounded-xl bg-baro-blue-50 px-4 py-3 text-center text-body-3 font-medium break-keep text-balance text-baro-navy">
        1:1 취업컨설팅은 유료 서비스입니다. 상담 시작 전 결제 안내를 드립니다.
      </div>

      <Button
        type="submit"
        className="h-14 w-full rounded-xl bg-atomic-blue-600 text-body-1 font-bold text-white"
      >
        상담 신청하기
      </Button>
    </form>
  );
}
