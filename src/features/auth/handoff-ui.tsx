/** 디자이너 핸드오프(handoff/auth/ui.tsx) 이식. 배경·버튼·플레이스홀더는 기존 사이트 톤(slate/brand-blue)으로 맞췄다. */
"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { formatPhoneInput } from "@/lib/utils/phone";
import { sendPhoneCodeAction, verifyPhoneCodeAction } from "./phone-verification-actions";
import type { PhoneVerificationPurpose } from "@/types";

/* 인증 화면 공통 UI. 모바일: 카드가 화면 폭에 맞춰 늘어나고 좌우 여백만 유지 */

export function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full justify-center bg-slate-50 px-4 py-8 sm:px-6 sm:py-14">
      <div className="w-full max-w-[460px]">
        <div className="rounded-2xl bg-white px-6 py-8 sm:rounded-2xl sm:px-12 sm:py-12">
          {children}
        </div>
      </div>
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="mb-7 flex items-center sm:mb-8">
      <Logo height={26} priority />
    </div>
  );
}

export function PageTitle({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-7 sm:mb-8">
      <h1 className="m-0 text-[26px] sm:text-[29px] font-bold leading-[1.3] tracking-[-0.035em] text-[#1c1a17]">
        {title}
      </h1>
      {desc ? (
        <p className="mt-2.5 mb-0 text-[14px] sm:text-[14.5px] leading-[1.6] text-slate-500">
          {desc}
        </p>
      ) : null}
    </div>
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-[9px] block text-[13.5px] font-bold text-[#1c1a17]"
    >
      {children}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ invalid, className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          "h-14 w-full min-w-0 rounded-lg px-[18px] text-[16px] text-[#1c1a17] outline-none",
          "placeholder:text-slate-400 transition-shadow",
          invalid
            ? "border-[1.5px] border-[#e5484d] bg-white"
            : "border-[1.5px] border-slate-200 bg-white focus:border-brand-blue-400 focus:ring-2 focus:ring-[#1f5eff]/20",
          className,
        )}
      />
    );
  }
);

/** 비밀번호 입력. 눈 아이콘으로 입력값을 잠시 확인할 수 있다(오타 확인용). */
export function PasswordInput({ className, ...props }: InputProps) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-12", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}

/**
 * 입력 + 보조 동작 버튼(인증/중복확인).
 * 버튼을 입력창 밖에 두면 큰 상자가 하나 더 생겨 시선을 뺏으므로, 입력창 안쪽 오른쪽에 작은 pill로 넣는다.
 */
export function InputWithAction({
  action,
  onAction,
  inputProps,
}: {
  action: string;
  onAction?: () => void;
  inputProps: InputProps;
}) {
  return (
    <div className="relative">
      <Input {...inputProps} className={cn("pr-[92px]", inputProps.className)} />
      <FieldActionButton onClick={onAction} disabled={inputProps.disabled}>
        {action}
      </FieldActionButton>
    </div>
  );
}

/** 입력창 안쪽 오른쪽에 겹쳐 놓는 작은 보조 버튼. */
export function FieldActionButton({
  children,
  tone = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "ok" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "absolute right-2 top-1/2 h-10 -translate-y-1/2 whitespace-nowrap rounded-md px-3.5",
        "text-[13.5px] font-semibold transition-colors",
        // 눌러야 진행되는 버튼이라 평소에도 활성 상태로 보이게 채워 둔다 (회색이면 비활성으로 읽힌다).
        tone === "ok"
          ? "bg-emerald-50 text-emerald-600"
          : "bg-brand-blue-400 text-white hover:bg-brand-blue-600 disabled:bg-slate-200 disabled:text-slate-400",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function HelpText({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "ok" | "error";
  children: React.ReactNode;
}) {
  const color =
    tone === "ok"
      ? "text-[#0f9d58]"
      : tone === "error"
      ? "text-[#e5484d]"
      : "text-slate-500";
  return (
    <p className={`mt-[9px] mb-0 text-[12.5px] ${color}`}>{children}</p>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="h-[58px] w-full rounded-lg bg-brand-blue-400 text-[16px] font-bold text-white transition-colors hover:bg-brand-blue-600 disabled:bg-slate-300 disabled:text-white"
    >
      {children}
    </button>
  );
}

export function SocialButtons({ next }: { next?: string }) {
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    // OAuth 시작은 서버 라우트로 이동하는 전체 페이지 네비게이션이라 <a>가 맞다.
    <div className="mt-4 flex flex-col gap-2">
      <a
        href={`/auth/login/naver${q}`}
        className="flex h-14 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#03C75A] text-[15px] font-bold text-white transition-colors hover:bg-[#02B351]"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5" fill="currentColor">
          <path d="M13.5 10.7 6.2 0H0v20h6.5V9.3L13.8 20H20V0h-6.5z" />
        </svg>
        네이버 로그인/회원가입
      </a>
      <a
        href={`/auth/login/kakao${q}`}
        className="flex h-14 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#FEE500] text-[15px] font-bold text-[#191600] transition-colors hover:bg-[#F2DA00]"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
          <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.7-1.8 3.8-2.6.6.1 1.2.1 1.9.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
        </svg>
        카카오 로그인/회원가입
      </a>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  strong,
  children,
  right,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  strong?: boolean;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={[
          "flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md text-[12px] leading-none",
          checked
            ? "bg-[#1f5eff] text-white"
            : "border-[1.5px] border-slate-300 text-transparent",
        ].join(" ")}
      >
        ✓
      </span>
      <span
        className={
          strong
            ? "text-[13.5px] font-bold text-[#1c1a17]"
            : "text-[13px] text-[#4a463f]"
        }
      >
        {children}
      </span>
      {right ? <span className="ml-auto">{right}</span> : null}
    </label>
  );
}

export function BottomLinks({
  items,
}: {
  items: { label: string; href: string; strong?: boolean }[];
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-[14px] gap-y-1.5 text-[13px]">
      {items.map((it, i) => (
        <React.Fragment key={it.href + it.label}>
          {i > 0 ? <span className="text-slate-300">·</span> : null}
          <Link
            href={it.href}
            className={
              it.strong
                ? "font-bold text-[#1c1a17] no-underline"
                : "text-slate-500 no-underline hover:text-[#1c1a17]"
            }
          >
            {it.label}
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
}

export function Divider() {
  return <div className="my-[22px] h-px bg-slate-200" />;
}

/**
 * 휴대전화 입력 + 인증번호 발송/검증 블록.
 * 검증 성공 시 상위로 verificationId를 올려주고, 번호가 바뀌면 인증 상태를 초기화한다.
 */
export function PhoneVerificationField({
  purpose,
  phone,
  onPhoneChange,
  onVerified,
  idPrefix,
}: {
  purpose: PhoneVerificationPurpose;
  phone: string;
  onPhoneChange: (v: string) => void;
  onVerified: (verificationId: string | null) => void;
  idPrefix: string;
}) {
  const [code, setCode] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [left, setLeft] = React.useState(0);
  const [verified, setVerified] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!sent || left <= 0) return;
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [sent, left]);

  const mmss = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;

  async function handleSend() {
    setBusy(true);
    setError(null);
    const result = await sendPhoneCodeAction({ phone, purpose });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "인증번호 발송에 실패했습니다.");
      return;
    }
    setSent(true);
    setLeft(180);
    setVerified(false);
    onVerified(null);
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    const result = await verifyPhoneCodeAction({ phone, code, purpose });
    setBusy(false);
    if (!result.ok || !result.verificationId) {
      setError(result.error ?? "인증번호가 올바르지 않습니다.");
      return;
    }
    setVerified(true);
    onVerified(result.verificationId);
  }

  return (
    <>
      <div>
        <Label htmlFor={`${idPrefix}-phone`}>휴대전화번호</Label>
        <InputWithAction
          action={sent ? "재전송" : "인증"}
          onAction={handleSend}
          inputProps={{
            id: `${idPrefix}-phone`,
            type: "tel",
            inputMode: "tel",
            autoComplete: "tel",
            placeholder: "010-0000-0000",
            value: phone,
            disabled: busy || verified,
            onChange: (e) => {
              onPhoneChange(formatPhoneInput(e.target.value));
              setVerified(false);
              setSent(false);
              onVerified(null);
            },
          }}
        />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-code`}>인증번호</Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-code`}
            inputMode="numeric"
            maxLength={6}
            placeholder="6자리 입력"
            value={code}
            disabled={!sent || verified}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="pr-[92px]"
          />
          <FieldActionButton
            onClick={handleVerify}
            disabled={!sent || verified || code.length !== 6 || busy}
            tone={verified ? "ok" : "default"}
          >
            {verified ? "완료" : "확인"}
          </FieldActionButton>
        </div>
        {verified ? <HelpText tone="ok">인증이 완료되었습니다</HelpText> : null}
        {!verified && sent ? <HelpText>남은 시간 {mmss}</HelpText> : null}
        {error ? <HelpText tone="error">{error}</HelpText> : null}
      </div>
    </>
  );
}
