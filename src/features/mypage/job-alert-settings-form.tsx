"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { REGION_LABELS } from "@/lib/labels";
import { JOB_CATEGORY_GROUPS } from "@/lib/jobs/job-category-groups";
import { cn } from "@/lib/utils";
import { listSigunguAction, saveJobAlertSettingsAction } from "./job-alert-actions";
import type { JobAlertSettings } from "@/services/job-alert.service";

/**
 * 마이페이지 "거주지 근처 공고 알림" 설정.
 * 켜는 것이 곧 알림톡 수신 동의라, 무엇을 언제 어떻게 보내는지 켜기 전에 보여준다.
 */
export function JobAlertSettingsForm({ initial, phone }: { initial: JobAlertSettings; phone?: string }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [region, setRegion] = useState(initial.region ?? "");
  const [sigungu, setSigungu] = useState(initial.regionSigungu ?? "");
  const [categories, setCategories] = useState<string[]>(initial.jobCategories);
  const [sigunguOptions, setSigunguOptions] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startSave] = useTransition();

  useEffect(() => {
    if (!region) {
      setSigunguOptions([]);
      return;
    }
    let alive = true;
    void listSigunguAction(region).then((list) => alive && setSigunguOptions(list));
    return () => {
      alive = false;
    };
  }, [region]);

  const dirty =
    enabled !== initial.enabled ||
    region !== (initial.region ?? "") ||
    sigungu !== (initial.regionSigungu ?? "") ||
    categories.join(",") !== initial.jobCategories.join(",");

  function toggleCategory(key: string) {
    setCategories((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function save() {
    setMessage(null);
    startSave(async () => {
      const result = await saveJobAlertSettingsAction({
        enabled,
        region: region || undefined,
        regionSigungu: sigungu || undefined,
        jobCategories: categories,
      });
      setMessage(result.ok ? (enabled ? "알림을 켰어요. 매일 아침 10시에 보내드릴게요." : "알림을 껐어요.") : result.error);
    });
  }

  return (
    <div className="space-y-4">
      {/* 켜기/끄기. 무엇에 동의하는지 스위치 옆에 바로 적는다. */}
      <button
        type="button"
        onClick={() => setEnabled((v) => !v)}
        aria-pressed={enabled}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
          enabled ? "border-brand-blue-200 bg-brand-blue-50/60" : "border-border bg-white hover:bg-slate-50",
        )}
      >
        <span
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            enabled ? "bg-brand-blue-600" : "bg-slate-300",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </span>
        <span className="min-w-0">
          <span className="block text-label-1 font-semibold text-slate-900">
            {enabled ? "공고 알림 받는 중" : "거주지 근처 공고 알림 받기"}
          </span>
          <span className="block text-label-2 break-keep text-slate-500">
            새 공고가 있으면 매일 아침 10시, 카카오톡 알림톡으로 하루 1건만 보내드려요
            {phone ? ` (${phone})` : ""}. 언제든 끌 수 있어요.
          </span>
        </span>
      </button>

      {enabled && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-label-2 font-semibold text-slate-500">지역 (필수)</span>
              <NativeSelect
                className="h-10 bg-white text-label-1"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setSigungu("");
                }}
              >
                <option value="">선택</option>
                {Object.entries(REGION_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="block">
              <span className="mb-1 block text-label-2 font-semibold text-slate-500">시·군·구 (선택)</span>
              <NativeSelect
                className="h-10 bg-white text-label-1"
                value={sigungu}
                onChange={(e) => setSigungu(e.target.value)}
                disabled={!region}
              >
                <option value="">전체</option>
                {sigunguOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-label-2 font-semibold text-slate-500">
              관심 직종 (선택, 안 고르면 전체)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {JOB_CATEGORY_GROUPS.map((g) => {
                const on = categories.includes(g.key);
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => toggleCategory(g.key)}
                    aria-pressed={on}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1.5 text-label-1 transition-colors",
                      on
                        ? "border-brand-blue-400 bg-brand-blue-50 font-medium text-brand-blue-700"
                        : "border-border bg-white text-slate-600 hover:border-brand-blue-200",
                    )}
                  >
                    {on && <Check className="size-3.5" />}
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || !dirty} className="bg-brand-blue-600 hover:bg-brand-blue-700">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
          설정 저장
        </Button>
        {message && <p className="text-label-1 text-slate-600">{message}</p>}
      </div>
    </div>
  );
}
