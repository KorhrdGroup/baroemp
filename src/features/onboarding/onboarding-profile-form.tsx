"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DESIRED_START_TIMING_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  REGION_LABELS,
  WORK_TYPE_LABELS,
} from "@/lib/labels";
import { ChipToggle, JOB_CATEGORY_OPTIONS } from "@/features/profile/profile-form-fields";
import {
  completeOnboardingProfileAction,
  skipOnboardingProfileAction,
  type OnboardingProfileFormState,
} from "./onboarding-actions";
import type { CareerProfile, WorkType } from "@/types";

const initialState: OnboardingProfileFormState = {};

const SELECT_CLASS = "h-11 w-full rounded-lg border border-input bg-background px-3 text-body-2";

export function OnboardingProfileForm({
  careerProfile,
  next,
  needsPhone,
  needsMarketingConsent,
}: {
  careerProfile: CareerProfile | null;
  next: string;
  /** 가입 때 연락처를 비워둔 사용자에게만 묻는다. */
  needsPhone: boolean;
  /** 가입 때 수신동의를 하지 않은 사용자에게만 묻는다. */
  needsMarketingConsent: boolean;
}) {
  const [state, formAction, pending] = useActionState(completeOnboardingProfileAction, initialState);
  const [jobCategories, setJobCategories] = useState<string[]>(careerProfile?.desiredJobCategories ?? []);
  const [workTypes, setWorkTypes] = useState<WorkType[]>(careerProfile?.desiredWorkTypes ?? []);

  return (
    <>
      <form action={formAction} className="space-y-7">
        <input type="hidden" name="next" value={next} />

        {state.error && (
          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-label-1 text-red-600" role="alert">
            {state.error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="employmentStatus" className="mb-1.5">
              현재 취업상태
            </Label>
            <select
              id="employmentStatus"
              name="employmentStatus"
              defaultValue={careerProfile?.employmentStatus ?? ""}
              className={SELECT_CLASS}
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
            <select id="region" name="region" defaultValue={careerProfile?.region ?? ""} className={SELECT_CLASS}>
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
              className={SELECT_CLASS}
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
                className="h-11"
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
                className="h-11"
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

        <label className="flex items-center gap-2 text-body-2 break-keep text-slate-700">
          <Checkbox name="isOpenToTraining" defaultChecked={careerProfile?.isOpenToTraining ?? false} />
          직업훈련·교육 과정에 참여할 의향이 있어요
        </label>

        {(needsPhone || needsMarketingConsent) && (
          <div className="space-y-3 rounded-xl bg-brand-blue-50 p-4">
            <p className="text-label-1 font-semibold text-brand-blue-700">맞춤 정보를 알림톡으로 받아보시겠어요?</p>
            {needsPhone && (
              <div>
                <Label htmlFor="phone" className="mb-1.5">
                  휴대전화번호
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="010-1234-5678"
                  className="h-11 bg-white"
                  aria-invalid={Boolean(state.fieldErrors?.phone)}
                />
                {state.fieldErrors?.phone && (
                  <p className="mt-1 text-label-2 text-red-600">{state.fieldErrors.phone}</p>
                )}
              </div>
            )}
            {needsMarketingConsent && (
              <>
                <input type="hidden" name="marketingConsentAsked" value="1" />
                <label className="flex items-start gap-2 text-label-1 break-keep text-slate-700">
                  <Checkbox name="marketingConsent" className="mt-0.5" />
                  <span>
                    맞춤 채용공고·지원금 정보를 알림톡으로 받는 데 동의합니다. (선택, 언제든 해지 가능)
                  </span>
                </label>
              </>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={pending}
          className="h-12 w-full bg-brand-blue-400 text-body-2 font-semibold hover:bg-brand-blue-600"
        >
          {pending ? "저장 중..." : "저장하고 시작하기"}
        </Button>
      </form>

      {/* 건너뛰기는 저장 폼 밖에 둬야 입력값 검증에 걸리지 않는다. */}
      <form action={skipOnboardingProfileAction} className="mt-3">
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="ghost" className="h-11 w-full text-body-2 text-slate-500">
          나중에 하기
        </Button>
      </form>
    </>
  );
}
