"use client";

import { useState, useTransition } from "react";
import { BellRing, Loader2, X } from "lucide-react";
import { REGION_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { JobAlertSettingsForm, jobAlertSummary } from "./job-alert-settings-form";
import { saveJobAlertSettingsAction } from "./job-alert-actions";
import type { JobAlertSettings } from "@/services/job-alert.service";

/**
 * 마이페이지 "공고 알림" 카드.
 * - 꺼진 회원: 희망 조건 지역이 있으면 "충남 공고 받기" 단추 한 번에 켠다. 다른 지역은 "지역 바꾸기"로 판을 연다.
 * - 켜진 회원: 무엇을 받는지 한 줄로 보이고, 스위치로 바로 끈다. 고칠 땐 "바꾸기".
 * 판(JobAlertSettingsForm)은 카드 안에서 열리고, 저장하면 닫힌다.
 */
export function JobAlertPanel({
  settings,
  phone,
  suggestedRegion,
  children,
}: {
  settings: JobAlertSettings;
  phone?: string;
  /** 희망 조건의 지역 코드. 꺼진 회원에게 바로 켜기 단추를 보이는 데 쓴다. */
  suggestedRegion?: string;
  /** 켜진 회원에게 카드 아래 보일 최근 받은 알림. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startSave] = useTransition();
  const quickRegion = settings.region ?? suggestedRegion;
  const quickLabel = quickRegion ? (quickRegion === "all" ? "전국" : REGION_LABELS[quickRegion as keyof typeof REGION_LABELS]) : undefined;

  function save(enabled: boolean, region?: string) {
    setError(null);
    startSave(async () => {
      const result = await saveJobAlertSettingsAction({
        enabled,
        region: region ?? settings.region,
        regionSigungu: settings.regionSigungu,
        jobCategories: settings.jobCategories,
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="rounded-card bg-white">
      <div className="flex flex-wrap items-center gap-4 p-5 sm:flex-nowrap sm:px-7 sm:py-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-baro-blue-50 text-baro-blue">
          <BellRing className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-1 font-semibold text-slate-900">
            {open ? "어떤 공고를 받을까요?" : settings.enabled ? "공고 알림 · 받는 중" : "공고 알림 · 꺼져 있어요"}
          </p>
          <p className="mt-0.5 text-body-2 font-medium break-keep text-slate-600">
            {open
              ? `고른 조건의 새 공고를 매일 아침 10시, 카카오톡${phone ? `(${phone})` : ""}으로 하루 1건 보내드려요.`
              : settings.enabled
                ? `${jobAlertSummary(settings)} · 매일 아침 10시`
                : "집 근처 새 공고를 카카오톡으로 하루 1건 보내드려요."}
          </p>
          {error && <p className="mt-1 text-body-3 font-medium text-red-600">{error}</p>}
        </div>

        {open ? (
          <button
            type="button"
            aria-label="설정 닫기"
            onClick={() => setOpen(false)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        ) : settings.enabled ? (
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="h-11 shrink-0 rounded-xl border border-slate-300 bg-white px-4 text-body-2 font-semibold text-slate-800"
            >
              바꾸기
            </button>
            <button
              type="button"
              role="switch"
              aria-checked
              aria-label="공고 알림 끄기"
              disabled={pending}
              onClick={() => save(false)}
              className="relative tap-44 h-7 w-12 shrink-0 rounded-full bg-baro-blue disabled:opacity-60"
            >
              <span aria-hidden className="absolute top-1 right-1 size-5 rounded-full bg-white" />
            </button>
          </div>
        ) : (
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "h-11 shrink-0 rounded-xl px-3 text-body-2 font-semibold",
                quickLabel ? "text-slate-600 underline underline-offset-4" : "border border-slate-300 bg-white px-4 text-slate-800",
              )}
            >
              {quickLabel ? "지역 바꾸기" : "켜기"}
            </button>
            {quickLabel && (
              <button
                type="button"
                disabled={pending}
                onClick={() => save(true, quickRegion)}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-baro-blue px-5 text-body-2 font-semibold text-white disabled:opacity-60"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                {quickLabel} 공고 알림 켜기
              </button>
            )}
          </div>
        )}
      </div>

      {open && <JobAlertSettingsForm initial={settings} suggestedRegion={suggestedRegion} onSaved={() => setOpen(false)} />}

      {!open && settings.enabled && children && <div className="border-t border-slate-100 px-5 py-4 sm:px-7">{children}</div>}
    </div>
  );
}
