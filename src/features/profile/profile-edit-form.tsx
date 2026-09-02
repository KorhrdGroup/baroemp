"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
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
import { ChipToggle, JOB_CATEGORY_OPTIONS, QUALIFICATION_OPTIONS } from "./profile-form-fields";
import { CustomQualificationInput } from "./custom-qualification-input";

/*
  고르는 칸. 창은 OS 기본 피커를 그대로 쓴다 - 모바일에서 커스텀 목록보다 그편이 낫다.
  다만 브라우저마다 다른 기본 화살표만 사이트 화살표로 바꾼다. 상자는 위 입력칸과 같은 규격이다.
*/
function SelectField({
  id,
  name,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="h-12 w-full appearance-none rounded-lg border border-input bg-background pr-11 pl-4 text-body-2 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-label-1"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}
import { updateProfileAction, type ProfileEditFormState } from "./profile-actions";
import type { CareerProfile, Profile, WorkType } from "@/types";

const initialState: ProfileEditFormState = {};

export function ProfileEditForm({
  profile,
  careerProfile,
  heldQualificationNames = [],
}: {
  profile: Profile;
  careerProfile: CareerProfile | null;
  /** Career DB(user_qualifications)에 등록된 보유 자격. 선택지에 있는 것만 체크 상태로 보인다. */
  heldQualificationNames?: string[];
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const [jobCategories, setJobCategories] = useState<string[]>(careerProfile?.desiredJobCategories ?? []);
  const [workTypes, setWorkTypes] = useState<WorkType[]>(careerProfile?.desiredWorkTypes ?? []);
  const [marketingConsent, setMarketingConsent] = useState<boolean>(Boolean(profile.marketingConsent));
  const [qualifications, setQualifications] = useState<string[]>(
    heldQualificationNames.filter((n) => QUALIFICATION_OPTIONS.includes(n)),
  );
  // 목록에 없는 자격(직접 적은 것, 이력서에서 올라온 것)은 직접 입력 칸에서 고친다.
  const [customQualifications, setCustomQualifications] = useState<string[]>(
    heldQualificationNames.filter((n) => !QUALIFICATION_OPTIONS.includes(n)),
  );

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
            <Label htmlFor="name" className="mb-1.5 text-slate-700">
              이름
            </Label>
            <Input id="name" name="name" defaultValue={profile.name} required />
            {state.fieldErrors?.name && <p className="mt-1 text-label-2 text-red-600">{state.fieldErrors.name}</p>}
          </div>
          <div>
            <Label htmlFor="phone" className="mb-1.5 text-slate-700">
              휴대전화번호
            </Label>
            <Input id="phone" name="phone" type="tel" defaultValue={profile.phone} placeholder="010-1234-5678" />
            {state.fieldErrors?.phone && <p className="mt-1 text-label-2 text-red-600">{state.fieldErrors.phone}</p>}
          </div>
          <div>
            <Label className="mb-1.5 text-slate-700">이메일</Label>
            <Input value={profile.email ?? ""} disabled />
            <p className="mt-1 text-label-2 text-slate-400">이메일은 변경할 수 없습니다.</p>
          </div>
        </div>
        {/* 알림톡 수신 동의. 가입·온보딩에서 켠 것을 여기서 끌 수 있어야 "언제든 철회"가 말이 된다. */}
        <label className="flex items-start gap-2.5 rounded-xl border border-border bg-white px-4 py-3.5 text-label-1 break-keep text-slate-700">
          <Checkbox
            className="mt-0.5"
            checked={marketingConsent}
            onCheckedChange={(v) => setMarketingConsent(v === true)}
          />
          <span>
            <span className="block font-medium text-slate-800">맞춤 채용공고·지원금 소식을 카카오 알림톡으로 받기</span>
            <span className="mt-0.5 block text-label-2 text-slate-500">
              무료이며 언제든 해제할 수 있어요.
              {profile.marketingConsent && profile.marketingConsentAt
                ? ` 동의일 ${profile.marketingConsentAt.slice(0, 10)}`
                : ""}{" "}
              <a
                href="/marketing-consent"
                target="_blank"
                rel="noopener"
                className="underline underline-offset-2 hover:text-slate-700"
              >
                동의 내용 보기
              </a>
            </span>
          </span>
        </label>
        <input type="hidden" name="marketingConsent" value={marketingConsent ? "on" : ""} />
      </section>

      <section className="space-y-4 border-t border-slate-100 pt-6">
        <h2 className="text-body-2 font-bold text-slate-900">취업 프로필</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="employmentStatus" className="mb-1.5 text-slate-700">
              취업상태
            </Label>
            <SelectField id="employmentStatus" name="employmentStatus" defaultValue={careerProfile?.employmentStatus ?? ""}>
              <option value="">선택 안함</option>
              {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <Label htmlFor="region" className="mb-1.5 text-slate-700">
              희망지역
            </Label>
            <SelectField id="region" name="region" defaultValue={careerProfile?.region ?? ""}>
              <option value="">선택 안함</option>
              {Object.entries(REGION_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <Label htmlFor="desiredStartTiming" className="mb-1.5 text-slate-700">
              희망 취업시기
            </Label>
            <SelectField id="desiredStartTiming" name="desiredStartTiming" defaultValue={careerProfile?.desiredStartTiming ?? ""}>
              <option value="">선택 안함</option>
              {Object.entries(DESIRED_START_TIMING_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="desiredSalaryMin" className="mb-1.5 text-slate-700">
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
              <Label htmlFor="desiredSalaryMax" className="mb-1.5 text-slate-700">
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
          <Label className="mb-2 text-slate-700">희망 근무형태</Label>
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
          <Label className="mb-2 text-slate-700">희망 직종</Label>
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

        <div>
          <Label className="mb-2 text-slate-700">보유 자격증</Label>
          <div className="flex flex-wrap gap-2">
            {QUALIFICATION_OPTIONS.map((name) => {
              const selected = qualifications.includes(name);
              return (
                <ChipToggle
                  key={name}
                  selected={selected}
                  onClick={() =>
                    setQualifications((prev) => (selected ? prev.filter((v) => v !== name) : [...prev, name]))
                  }
                >
                  {name}
                </ChipToggle>
              );
            })}
          </div>
          {/* 목록에 없는 자격은 직접 적는다. 적은 것도 같은 이름(heldQualifications)으로 함께 보낸다. */}
          <CustomQualificationInput
            className="mt-3"
            values={customQualifications}
            onChange={setCustomQualifications}
            reserved={QUALIFICATION_OPTIONS}
          />
          {[...qualifications, ...customQualifications].map((v) => (
            <input key={v} type="hidden" name="heldQualifications" value={v} />
          ))}
        </div>

        <label className="flex items-center gap-2 text-label-1 text-slate-700">
          <Checkbox name="isOpenToTraining" defaultChecked={careerProfile?.isOpenToTraining ?? false} />
          직업훈련·교육 과정에 참여할 의향이 있어요
        </label>
      </section>

      <Button type="submit" disabled={pending} className="w-full bg-brand-blue-400 hover:bg-brand-blue-600 sm:w-auto">
        {pending ? "저장 중..." : "저장하기"}
      </Button>
    </form>
  );
}
