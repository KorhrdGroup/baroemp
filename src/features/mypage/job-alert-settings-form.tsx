"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { REGION_LABELS } from "@/lib/labels";
import { JOB_CATEGORY_GROUPS } from "@/lib/jobs/job-category-groups";
import { cn } from "@/lib/utils";
import { listSigunguAction, saveJobAlertSettingsAction } from "./job-alert-actions";
import type { JobAlertSettings } from "@/services/job-alert.service";

/* 일자리 찾기 필터와 같은 칸(누르면 파랑). 드롭다운보다 한눈에 보이고 한 번에 누른다. */
const choiceClass = "flex h-12 items-center justify-center rounded-xl px-3 text-body-2 break-keep whitespace-nowrap";
const choiceOnClass = "bg-baro-blue-50 font-semibold text-baro-blue-600 ring-2 ring-baro-blue ring-inset";
const choiceOffClass = "bg-white font-semibold text-slate-800 ring-1 ring-slate-300 ring-inset";
/** 저장할 수 있는 직종 수(saveJobAlertSettingsAction 이 5개까지만 받는다). */
const MAX_CATEGORIES = 5;

const REGION_CHOICES: { key: string; label: string }[] = [{ key: "all", label: "전국" }, ...Object.entries(REGION_LABELS).map(([key, label]) => ({ key, label }))];

/** "충남 천안시 · 요양보호사" - 카드 한 줄과 판 아래 요약에 같이 쓴다. */
export function jobAlertSummary(s: { region?: string; regionSigungu?: string; jobCategories: string[] }): string {
  const regionLabel = s.region === "all" ? "전국" : s.region ? (REGION_LABELS[s.region as keyof typeof REGION_LABELS] ?? s.region) : "";
  const where = s.regionSigungu && s.region !== "all" ? `${regionLabel} ${s.regionSigungu}` : regionLabel;
  const what = s.jobCategories.length
    ? s.jobCategories.map((k) => JOB_CATEGORY_GROUPS.find((g) => g.key === k)?.label ?? k).join(" · ")
    : "모든 직종";
  return [where, what].filter(Boolean).join(" · ");
}

/**
 * 마이페이지 공고 알림 설정 판. 지역 → (선택) 시군구 → 직종을 칸으로 고르고 "이대로 알림 받기" 한 번에 켜고 저장한다.
 * 판 안에 켜기 스위치를 따로 두지 않는다 - 켜려고 연 판에서 또 켜라고 하면 헷갈린다. 끄기는 카드의 스위치가 맡는다.
 * 켜는 것이 곧 알림톡 수신 동의라, 무엇을 언제 어떻게 보내는지 판 머리에 적는다.
 */
export function JobAlertSettingsForm({
  initial,
  suggestedRegion,
  onSaved,
}: {
  initial: JobAlertSettings;
  /** 아직 지역을 안 정했으면 희망 조건 지역으로 먼저 골라 둔다. */
  suggestedRegion?: string;
  onSaved: () => void;
}) {
  const [region, setRegion] = useState(initial.region ?? suggestedRegion ?? "");
  const [sigungu, setSigungu] = useState(initial.regionSigungu ?? "");
  const [categories, setCategories] = useState<string[]>(initial.jobCategories);
  /* 불러온 시군구 목록은 어느 지역 것인지 함께 둔다 - 지역을 바꾸면 이전 목록이 잠깐 보이지 않게. */
  const [loaded, setLoaded] = useState<{ region: string; list: string[] }>({ region: "", list: [] });
  const sigunguOptions = loaded.region === region ? loaded.list : [];
  const [error, setError] = useState<string | null>(null);
  const [pending, startSave] = useTransition();

  useEffect(() => {
    if (!region || region === "all") return;
    let alive = true;
    void listSigunguAction(region).then((list) => alive && setLoaded({ region, list }));
    return () => {
      alive = false;
    };
  }, [region]);

  function toggleCategory(key: string) {
    setCategories((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : prev.length >= MAX_CATEGORIES ? prev : [...prev, key]));
  }

  function save() {
    setError(null);
    startSave(async () => {
      const result = await saveJobAlertSettingsAction({
        enabled: true,
        region: region || undefined,
        regionSigungu: sigungu || undefined,
        jobCategories: categories,
      });
      if (result.ok) onSaved();
      else setError(result.error);
    });
  }

  const regionLabel = REGION_CHOICES.find((r) => r.key === region)?.label;

  return (
    <div>
      <div className="space-y-7 border-t border-slate-100 p-5 sm:px-7 sm:py-6">
        <Group title="지역">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
            {REGION_CHOICES.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={r.key === region}
                onClick={() => {
                  setRegion(r.key);
                  setSigungu("");
                }}
                className={cn(choiceClass, r.key === region ? choiceOnClass : choiceOffClass)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Group>

        {region && region !== "all" && sigunguOptions.length > 0 && (
          <Group title={`${regionLabel} 안에서 더 좁힐까요?`} note="안 골라도 돼요">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
              {["", ...sigunguOptions].map((s) => (
                <button
                  key={s || "all"}
                  type="button"
                  aria-pressed={s === sigungu}
                  onClick={() => setSigungu(s)}
                  className={cn(choiceClass, s === sigungu ? choiceOnClass : choiceOffClass)}
                >
                  {s || "전체"}
                </button>
              ))}
            </div>
          </Group>
        )}

        <Group title="직종" note={`${MAX_CATEGORIES}개까지 고를 수 있어요 · 안 고르면 모든 직종`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {JOB_CATEGORY_GROUPS.map((g) => {
              const on = categories.includes(g.key);
              return (
                <button
                  key={g.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCategory(g.key)}
                  className={cn(choiceClass, on ? choiceOnClass : choiceOffClass)}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </Group>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-7">
        <p className="flex-1 text-body-2 font-semibold break-keep text-slate-700">
          {error ? (
            <span className="text-red-600">{error}</span>
          ) : region ? (
            jobAlertSummary({ region, regionSigungu: sigungu, jobCategories: categories })
          ) : (
            "알림을 받을 지역을 골라 주세요."
          )}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={pending || !region}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-baro-blue px-7 text-body-1 font-semibold text-white disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          이대로 알림 받기
        </button>
      </div>
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-body-2 font-semibold text-slate-800">
        {title}
        {note && <span className="ml-2 text-body-3 font-medium text-slate-600">{note}</span>}
      </p>
      {children}
    </div>
  );
}
