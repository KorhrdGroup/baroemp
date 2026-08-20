"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, type AuthFormState } from "./auth-actions";
import { FormError } from "./auth-card";

const initialState: AuthFormState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormError message={state.error} />

      <div>
        <Label htmlFor="email" className="mb-1.5">
          이메일
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>

      <div>
        <Label htmlFor="password" className="mb-1.5">
          비밀번호
        </Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-label-2 text-slate-500">
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <Button type="submit" disabled={pending} className="w-full bg-brand-blue-400 hover:bg-brand-blue-600">
        {pending ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}
