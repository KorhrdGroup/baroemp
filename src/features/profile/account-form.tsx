"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccountAction, type AccountFormState } from "./account-actions";
import { formatPhoneInput } from "@/lib/utils/phone";
import type { Profile } from "@/types";

const initialState: AccountFormState = {};
const inputClass = "h-12 rounded-xl border-slate-300 bg-white text-body-2 font-medium md:text-body-2";

/** 내 정보(이름 · 휴대전화 · 이메일). 희망 조건은 /mypage/profile 에서 따로 고친다. */
export function AccountForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateAccountAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.success && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-body-3 font-medium text-emerald-700" role="status">
          바꾼 내용을 저장했어요.
        </div>
      )}
      {state.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-body-3 font-medium text-red-600" role="alert">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" className="mb-1.5 text-body-3 font-semibold text-slate-700">
            이름
          </Label>
          <Input id="name" name="name" defaultValue={profile.name} required className={inputClass} />
          {state.fieldErrors?.name && <p className="mt-1 text-body-3 font-medium text-red-600">{state.fieldErrors.name}</p>}
        </div>
        <div>
          <Label htmlFor="phone" className="mb-1.5 text-body-3 font-semibold text-slate-700">
            휴대전화번호
          </Label>
          <Input id="phone" name="phone" type="tel" defaultValue={formatPhoneInput(profile.phone ?? "")}
            onChange={(e) => { e.target.value = formatPhoneInput(e.target.value); }}
            placeholder="010-1234-5678" className={inputClass} />
          {state.fieldErrors?.phone ? (
            <p className="mt-1 text-body-3 font-medium text-red-600">{state.fieldErrors.phone}</p>
          ) : (
            <p className="mt-1 text-body-3 font-medium text-slate-600">공고 알림도 이 번호로 보내드려요.</p>
          )}
        </div>
        <div>
          <Label htmlFor="email" className="mb-1.5 text-body-3 font-semibold text-slate-700">
            이메일
          </Label>
          <Input id="email" value={profile.email ?? ""} disabled className={inputClass} />
          <p className="mt-1 text-body-3 font-medium text-slate-600">이메일은 바꿀 수 없어요.</p>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-6">
        <Button type="submit" disabled={pending} className="h-12 rounded-xl bg-brand-blue-400 px-6 text-body-2 font-semibold hover:bg-brand-blue-600">
          {pending ? "저장 중..." : "저장하기"}
        </Button>
      </div>
    </form>
  );
}
