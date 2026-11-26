"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { JobAlertSettingsForm } from "./job-alert-settings-form";
import type { JobAlertSettings } from "@/services/job-alert.service";

/**
 * 마이페이지 "공고 알림" 한 줄. 지역 · 직종 고르기까지 늘 펼쳐 두면 화면이 무거워
 * 켜짐/꺼짐 한 줄과 단추 하나만 두고, 단추를 누르면 그 자리에서 설정을 연다.
 * 꺼진 회원이 "켜기"를 누르면 스위치가 켜진 채로 열려 지역만 고르고 저장하면 된다.
 */
export function JobAlertPanel({
  settings,
  phone,
  children,
}: {
  settings: JobAlertSettings;
  phone?: string;
  /** 펼쳤을 때 설정 아래에 보일 최근 받은 알림. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-card bg-white p-5 sm:px-7 sm:py-6">
      <div className="flex items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-baro-blue-50 text-baro-blue">
          <BellRing className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-1 font-bold text-slate-900">공고 알림 · {settings.enabled ? "받는 중" : "꺼져 있어요"}</p>
          <p className="mt-0.5 text-body-2 font-medium break-keep text-slate-600">
            {settings.enabled
              ? "새 공고가 있으면 매일 아침 10시 카카오톡으로 보내드려요."
              : "집 근처 새 공고를 카카오톡으로 하루 1건 보내드려요."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="h-11 shrink-0 rounded-xl border border-slate-300 bg-white px-4 text-body-2 font-bold text-slate-800"
        >
          {open ? "닫기" : settings.enabled ? "설정" : "켜기"}
        </button>
      </div>
      {open && (
        <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <JobAlertSettingsForm initial={settings} phone={phone} startEnabled />
          {children}
        </div>
      )}
    </div>
  );
}
