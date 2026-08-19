"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DESIRED_START_TIMING_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  REGION_LABELS,
  WORK_TYPE_LABELS,
} from "@/lib/labels";
import { updateProfileAction, type ProfileEditFormState } from "./profile-actions";
import type { CareerProfile, Profile, WorkType } from "@/types";

const JOB_CATEGORY_OPTIONS: { code: string; label: string }[] = [
  { code: "care_worker", label: "요양보호사·돌봄" },
  { code: "social_worker", label: "사회복지사" },
  { code: "office_admin", label: "사무·행정직" },
  { code: "facility_cleaning", label: "시설관리·미화" },
  { code: "hospital_companion", label: "병원동행·간병" },
  { code: "logistics_driver", label: "배송·운전직" },
  { code: "other", label: "기타" },
];

const initialState: ProfileEditFormState = {};

function ChipToggle({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-label-1 font-medium transition-colors",
        selected
          ? "border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700"
          : "border-border text-slate-600 hover:border-brand-blue-300",
      )}
    >
      {children}
    </button>
  );
}

export function ProfileEditForm({ profile, careerProfile }: { profile: Profile; careerProfile: CareerProfile | null }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const [jobCategories, setJobCategories] = useState<string[]>(careerProfile?.desiredJobCategories ?? []);
  const [workTypes, setWorkTypes] = useState<WorkType[]>(careerProfile?.desiredWorkTypes ?? []);

  return (
    <form action={formAction} className="space-y-8">
      {state.success && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-label-1 text-emerald-700" role="status">
          변경사항이 저장되었습니다.
        </div>
      )}
      {state.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2.5 text-label-1 text-red-600" role="alert">
          {state.error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-body-2 font-bold text-slate-900">내 정보</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name" className="mb-1.5">
              이름
            </Label>
            <Input id="name" name="name" defaultValue={profile.name} required />
            {state.fieldErrors?.name && <p className="mt-1 text-label-2 text-red-600">{state.fieldErrors.name}</p>}
          </div>
          <div>
            <Label htmlFor="phone" className="mb-1.5">
              휴대전화번호
            </Label>
            <Input id="phone" name="phone" type="tel" defaultValue={profile.phone} placeholder="010-1234-5678" />
            {state.fieldErrors?.phone && <p className="mt-1 text-label-2 text-red-600">{state.fieldErrors.phone}</p>}
          </div>
          <div>
            <Label className="mb-1.5">이메일</Label>
            <Input value={profile.email ?? ""} disabled />
            <p className="mt-1 text-label-2 text-slate-400">이메일은 변경할 수 없습니다.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-100 pt-6">
        <h2 className="text-body-2 font-bold text-slate-900">취업 프로필</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="employmentStatus" className="mb-1.5">
              취업상태
            </Label>
            <select
              id="employmentStatus"
              name="employmentStatus"
              defaultValue={careerProfile?.employmentStatus ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-label-1"
            >
              <option value="">선택 안함</option>
              {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="region" className="mb-1.5">
              희망지역
            </Label>
            <select
              id="region"
              name="region"
              defaultValue={careerProfile?.region ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-label-1"
            >
              <option value="">선택 안함</option>
              {Object.entries(REGION_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="desiredStartTiming" className="mb-1.5">
              희망 취업시기
            </Label>
            <select
              id="desiredStartTiming"
              name="desiredStartTiming"
              defaultValue={careerProfile?.desiredStartTiming ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-label-1"
            >
              <option value="">선택 안함</option>
              {Object.entries(DESIRED_START_TIMING_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="desiredSalaryMin" className="mb-1.5">
                희망급여(만원, 최소)
              </Label>
              <Input
                id="desiredSalaryMin"
                name="desiredSalaryMin"
                type="number"
                inputMode="numeric"
                defaultValue={careerProfile?.desiredSalaryMin ?? ""}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="desiredSalaryMax" className="mb-1.5">
                최대
              </Label>
              <Input
                id="desiredSalaryMax"
                name="desiredSalaryMax"
                type="number"
                inputMode="numeric"
                defaultValue={careerProfile?.desiredSalaryMax ?? ""}
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="mb-2">희망 근무형태</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(WORK_TYPE_LABELS).map(([code, label]) => {
              const value = code as WorkType;
              const selected = workTypes.includes(value);
              return (
                <ChipToggle
                  key={code}
                  selected={selected}
                  onClick={() =>
                    setWorkTypes((prev) => (selected ? prev.filter((v) => v !== value) : [...prev, value]))
                  }
                >
                  {label}
                </ChipToggle>
              );
            })}
          </div>
          {workTypes.map((v) => (
            <input key={v} type="hidden" name="desiredWorkTypes" value={v} />
          ))}
        </div>

        <div>
          <Label className="mb-2">희망 직종</Label>
          <div className="flex flex-wrap gap-2">
            {JOB_CATEGORY_OPTIONS.map((opt) => {
              const selected = jobCategories.includes(opt.code);
              return (
                <ChipToggle
                  key={opt.code}
                  selected={selected}
                  onClick={() =>
                    setJobCategories((prev) =>
                      selected ? prev.filter((v) => v !== opt.code) : [...prev, opt.code],
                    )
                  }
                >
                  {opt.label}
                </ChipToggle>
              );
            })}
          </div>
          {jobCategories.map((v) => (
            <input key={v} type="hidden" name="desiredJobCategories" value={v} />
          ))}
        </div>

        <label className="flex items-center gap-2 text-label-1 text-slate-700">
          <Checkbox name="isOpenToTraining" defaultChecked={careerProfile?.isOpenToTraining ?? false} />
          직업훈련·교육 과정에 참여할 의향이 있어요
        </label>
      </section>

      <Button type="submit" disabled={pending} className="w-full bg-brand-blue-500 hover:bg-brand-blue-600 sm:w-auto">
        {pending ? "저장 중..." : "저장하기"}
      </Button>
    </form>
  );
}
