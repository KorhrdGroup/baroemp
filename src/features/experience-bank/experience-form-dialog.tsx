"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExperienceBankItem } from "@/types";
import { createExperienceBankItemAction, updateExperienceBankItemAction } from "./experience-bank-actions";

const EMPTY_FORM = { title: "", situation: "", task: "", action: "", result: "" };
type FormState = typeof EMPTY_FORM;
type Step = { key: keyof FormState; question: string; example: string };

/**
 * STAR 용어를 노출하지 않고 쉬운 질문으로 입력받는다 (스펙 35번).
 * 칸마다 같은 이야기로 이어지는 예시를 질문 바로 아래에 둔다. 칸 안 흐린 글씨로 두면 쓰기 시작하는 순간 사라져 따라 쓸 수 없다.
 */
const STEPS: Step[] = [
  { key: "title", question: "이 경험을 뭐라고 부르면 좋을까요?", example: "예: 치매 어르신과 신뢰 쌓기" },
  { key: "situation", question: "어떤 상황이었나요?", example: "예: 요양원에서 낯을 많이 가리시는 어르신을 맡게 됐어요" },
  { key: "task", question: "어떤 역할을 맡았나요?", example: "예: 어르신이 식사와 활동에 잘 참여하시도록 돕는 일" },
  { key: "action", question: "무엇을 했나요?", example: "예: 매일 같은 시간에 말을 걸고, 좋아하시는 노래를 함께 불렀어요" },
  { key: "result", question: "결과는 어땠나요?", example: "예: 한 달 뒤 먼저 웃으며 인사해 주셨어요" },
];
const STORY_STEPS = STEPS.slice(1);

/* 흰 창 위에 회색 면을 깔면 탁해서 흰 바탕 + 옅은 푸른빛 회색 테두리로 칸 자리만 보이게 한다. */
const fieldClass =
  "mt-5 rounded-xl border-[#DDE3EC] bg-white px-4 text-body-1 font-medium shadow-none md:text-body-1";
const smallTitleClass = "text-body-2 font-bold text-slate-600";
const primaryButtonClass = "h-14 flex-1 rounded-xl bg-baro-blue text-body-1 font-bold text-white";
const secondaryButtonClass = "h-14 w-28 rounded-xl border-slate-300 bg-white text-body-1 font-semibold text-slate-800";

function toForm(item: ExperienceBankItem | null): FormState {
  if (!item) return EMPTY_FORM;
  return {
    title: item.title,
    situation: item.situation ?? "",
    task: item.task ?? "",
    action: item.action ?? "",
    result: item.result ?? "",
  };
}

/** 쓰던 내용이 있을 때 창을 닫으려 하면 바로 닫지 않고 안쪽 화면에 맡긴다(저장할지 묻기). */
type CloseGuard = { dirty: boolean; requestClose: () => void };
type RegisterGuard = (guard: CloseGuard | null) => void;

function useCloseGuard(register: RegisterGuard, dirty: boolean, requestClose: () => void) {
  /* 매 렌더 최신 상태로 다시 건다. 가벼운 대입뿐이라 의존성을 따로 두지 않는다. */
  useEffect(() => register({ dirty, requestClose }));
  useEffect(() => () => register(null), [register]);
}

/**
 * 경험 하나를 추가하거나 저장된 경험을 보고 고치는 창.
 *
 * 이력서 화면의 경험뱅크 목록과 자기소개서 작성 시작 화면 양쪽에서 쓴다.
 * 같은 입력을 두 벌 두면 질문 문구가 갈라지므로 창 하나만 두고 부르는 쪽이 결과를 받는다.
 *
 * 새로 쓸 때는 질문을 한 칸씩 넘기고, 저장된 경험을 열면 이야기 전체를 읽는 화면을 먼저 보인다.
 * 저장된 경험은 고치기보다 자기소개서에 쓰기 전에 다시 읽는 일이 많아서다.
 */
export function ExperienceFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null이면 새로 추가, 값이 있으면 그 항목을 읽기 화면으로 연다 */
  editing: ExperienceBankItem | null;
  onSaved: (item: ExperienceBankItem, isNew: boolean) => void;
}) {
  /*
    쓰던 내용이 있으면 닫기(×) · Esc 에서 바로 닫지 않고 저장할지 묻는다. 중간 저장 단추를 따로 두지 않아도
    그만 쓰고 싶을 때 자연스럽게 저장할 수 있다. 4060 회원은 창 바깥을 잘못 누르는 일이 잦아,
    바깥 클릭은 묻지도 않고 그냥 막는다.
  */
  const guardRef = useRef<CloseGuard | null>(null);
  const registerGuard = useCallback<RegisterGuard>((guard) => {
    guardRef.current = guard;
  }, []);
  const close = () => onOpenChange(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && guardRef.current?.dirty) guardRef.current.requestClose();
        else onOpenChange(next);
      }}
    >
      <DialogContent
        className="draft3-theme max-h-[88vh] gap-0 overflow-y-auto rounded-card p-6 sm:max-w-lg sm:p-7"
        onInteractOutside={(e) => {
          if (guardRef.current?.dirty) e.preventDefault();
        }}
      >
        {/*
          입력값은 창 안쪽에서 들고 있는다. 창이 닫히면 이 컴포넌트가 통째로 사라지므로,
          다음에 열 때 지금 고른 경험의 값으로 새로 채워진다. 바깥에서 상태를 들고
          "열릴 때 다시 채우기"로 맞추면, 부모가 open 을 직접 켜는 경우(목록의 수정하기)
          그 시점을 알 수 없어 이전 값이 그대로 남는다.
        */}
        {editing ? (
          <ExperienceDetail item={editing} onSaved={(item) => onSaved(item, false)} onClose={close} registerGuard={registerGuard} />
        ) : (
          <ExperienceWizard onSaved={(item) => onSaved(item, true)} onClose={close} registerGuard={registerGuard} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** 질문 하나 + 예시 + 입력 칸 + 안내(또는 오류) 한 줄. 새로 쓸 때와 한 칸 고칠 때 같이 쓴다. */
function QuestionField({
  step,
  value,
  onChange,
  error,
  hint,
}: {
  step: Step;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  hint?: string;
}) {
  const fieldId = `experience-${step.key}`;
  /* 이미 쓴 글을 고치러 열면 커서가 맨 앞에 놓여 이어 쓰기 어렵다. 끝으로 옮긴다. */
  const caretToEnd = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const end = e.currentTarget.value.length;
    e.currentTarget.setSelectionRange(end, end);
  };
  return (
    <>
      <Label htmlFor={fieldId} className="mt-7 block text-title-2 leading-snug font-extrabold tracking-[-0.02em] break-keep text-slate-900">
        {step.question}
      </Label>
      <p className="mt-2 text-body-2 font-medium break-keep text-slate-600">{step.example}</p>
      {/* key 로 질문마다 칸을 새로 그려 바뀔 때마다 바로 쓸 수 있게 초점을 준다. */}
      {step.key === "title" ? (
        <Input
          key={fieldId}
          id={fieldId}
          autoFocus
          className={`${fieldClass} h-14`}
          value={value}
          aria-invalid={error ? true : undefined}
          onFocus={caretToEnd}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Textarea
          key={fieldId}
          id={fieldId}
          autoFocus
          className={`${fieldClass} min-h-40 resize-none py-3.5 leading-relaxed`}
          value={value}
          onFocus={caretToEnd}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error ? (
        <p role="alert" className="mt-2.5 text-body-3 font-medium text-rose-700">
          {error}
        </p>
      ) : (
        hint && <p className="mt-2.5 text-body-3 font-medium break-keep text-slate-600">{hint}</p>
      )}
    </>
  );
}

/** 닫으려 할 때 창 안 내용을 바꿔 끼우는 확인 화면. 창 위에 창을 하나 더 띄우면 어느 창인지 헷갈린다. */
function CloseConfirm({
  title,
  message,
  keepLabel,
  isSaving,
  error,
  onSave,
  onDiscard,
  onKeep,
}: {
  title: string;
  message: string;
  keepLabel: string;
  isSaving: boolean;
  error: string | null;
  onSave: () => void;
  onDiscard: () => void;
  onKeep: () => void;
}) {
  return (
    <div>
      <DialogHeader>
        <DialogTitle className="text-title-2 leading-snug font-extrabold tracking-[-0.02em] break-keep text-slate-900">{title}</DialogTitle>
        <DialogDescription className="mt-1 text-body-1 font-medium break-keep text-slate-600">
          {message}
        </DialogDescription>
      </DialogHeader>
      {error && (
        <p role="alert" className="mt-3 text-body-3 font-medium text-rose-700">
          {error}
        </p>
      )}
      <div className="mt-7 flex flex-col gap-2">
        <Button type="button" autoFocus className={`${primaryButtonClass} w-full flex-none`} onClick={onSave} disabled={isSaving}>
          {isSaving && <Loader2 className="size-5 animate-spin" />}
          저장하고 닫기
        </Button>
        <Button type="button" variant="outline" className={`${secondaryButtonClass} w-full`} onClick={onDiscard} disabled={isSaving}>
          저장하지 않고 닫기
        </Button>
      </div>
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={onKeep}
          disabled={isSaving}
          className="h-11 px-3 text-body-2 font-semibold text-slate-600 underline underline-offset-4"
        >
          {keepLabel}
        </button>
      </div>
    </div>
  );
}

/*
  새로 쓰기. 질문 다섯 개를 한 화면에 늘어놓으면 4060 회원에게는 빈 칸 다섯 개를 다 채워야 하는 서류처럼 보였다.
  한 화면에 질문 하나만 크게 두고 "다음"으로 넘긴다. 제목만 꼭 쓰고, 중간에 닫으려 하면 여기까지 저장할지 묻는다.
*/
function ExperienceWizard({
  onSaved,
  onClose,
  registerGuard,
}: {
  onSaved: (item: ExperienceBankItem) => void;
  onClose: () => void;
  registerGuard: RegisterGuard;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isSaving, startSave] = useTransition();
  /* 확인 화면에서 다시 닫기(× · Esc)를 누르면 질문을 거둔 것으로 보고 쓰던 화면으로 돌아간다. */
  useCloseGuard(registerGuard, Object.values(form).some((v) => v.trim()), () => setConfirming((c) => !c));

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  function handleSave() {
    startSave(async () => {
      try {
        setError(null);
        onSaved(await createExperienceBankItemAction(form));
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  /* 제목이 없으면 저장할 수 없다. 제목 칸으로 돌려보내 알린다. */
  function handleSaveAndClose() {
    if (!form.title.trim()) {
      setConfirming(false);
      setStep(0);
      setError("저장하려면 경험 제목을 입력해주세요.");
      return;
    }
    handleSave();
  }

  if (confirming) {
    return (
      <CloseConfirm
        title="쓰던 경험을 저장할까요?"
        message="저장해 두면 나머지는 나중에 이어서 쓸 수 있어요."
        keepLabel="계속 쓰기"
        isSaving={isSaving}
        error={error}
        onSave={handleSaveAndClose}
        onDiscard={onClose}
        onKeep={() => setConfirming(false)}
      />
    );
  }

  function handleNext() {
    if (isFirst && !form.title.trim()) {
      setError("경험 제목을 입력해주세요.");
      return;
    }
    setError(null);
    if (isLast) handleSave();
    else setStep((s) => s + 1);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleNext();
      }}
    >
      <DialogHeader>
        <DialogTitle className={smallTitleClass}>내 경험 추가하기</DialogTitle>
        <DialogDescription className="sr-only">여기에 정리해둔 경험은 자기소개서 문항마다 골라 쓸 수 있어요.</DialogDescription>
      </DialogHeader>
      <div className="mt-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="경험 정리 단계"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
        >
          <div className="h-full rounded-full bg-baro-blue transition-[width] duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <p className="shrink-0 text-body-2 font-bold text-baro-blue-600">
          {step + 1} <span className="font-semibold text-slate-500">/ {STEPS.length}</span>
        </p>
      </div>

      <QuestionField
        step={current}
        value={form[current.key]}
        onChange={(value) => {
          if (isFirst) setError(null);
          setForm((f) => ({ ...f, [current.key]: value }));
        }}
        error={error}
        hint={isFirst ? "제목만 써도 저장돼요. 나머지는 나중에 채워도 괜찮아요." : "떠오르지 않으면 비워 두고 넘어가도 괜찮아요."}
      />

      <div className="mt-7 flex gap-2">
        {!isFirst && (
          <Button
            type="button"
            variant="outline"
            className={secondaryButtonClass}
            onClick={() => {
              setError(null);
              setStep((s) => s - 1);
            }}
            disabled={isSaving}
          >
            이전
          </Button>
        )}
        <Button type="submit" className={primaryButtonClass} disabled={isSaving}>
          {isSaving && <Loader2 className="size-5 animate-spin" />}
          {isLast ? "경험 저장하기" : "다음"}
        </Button>
      </div>
    </form>
  );
}

/* 저장된 경험 열기. 이야기 전체를 한 화면에서 읽고, 고칠 칸만 하나씩 열어 바로 저장한다. */
function ExperienceDetail({
  item: initialItem,
  onSaved,
  onClose,
  registerGuard,
}: {
  item: ExperienceBankItem;
  onSaved: (item: ExperienceBankItem) => void;
  onClose: () => void;
  registerGuard: RegisterGuard;
}) {
  const [item, setItem] = useState(initialItem);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const values = toForm(item);

  if (editingStep) {
    return (
      <FieldEditor
        item={item}
        step={editingStep}
        onCancel={() => setEditingStep(null)}
        onSaved={(updated) => {
          setItem(updated);
          onSaved(updated);
          setEditingStep(null);
        }}
        onClose={onClose}
        registerGuard={registerGuard}
      />
    );
  }

  const filled = STORY_STEPS.filter((s) => values[s.key].trim()).length;

  return (
    <div>
      <p className={smallTitleClass}>내 경험</p>
      <DialogHeader className="mt-1.5 flex-row items-start justify-between gap-3">
        <DialogTitle className="text-title-2 leading-snug font-extrabold tracking-[-0.02em] break-keep text-slate-900">{item.title}</DialogTitle>
        <EditButton label="제목 고치기" onClick={() => setEditingStep(STEPS[0])} />
      </DialogHeader>
      <DialogDescription className="mt-1.5 text-body-3 font-medium text-slate-600">
        {STORY_STEPS.length}칸 중 {filled}칸 썼어요 · 최근수정 {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
      </DialogDescription>

      <ol className="mt-5 border-t border-slate-100">
        {STORY_STEPS.map((s, i) => {
          const answer = values[s.key].trim();
          return (
            <li key={s.key} className="border-b border-slate-100 py-4.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body-2 font-bold break-keep text-slate-800">
                  <span className="mr-1.5 text-baro-blue-600">{i + 1}</span>
                  {s.question}
                </p>
                {answer && <EditButton label={`${s.question} 고치기`} onClick={() => setEditingStep(s)} />}
              </div>
              {answer ? (
                <p className="mt-2 text-body-1 leading-relaxed font-medium break-keep whitespace-pre-line text-slate-900">{answer}</p>
              ) : (
                <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl bg-baro-page px-4 py-3">
                  <p className="text-body-2 font-medium text-slate-600">아직 안 썼어요</p>
                  <button
                    type="button"
                    aria-label={`${s.question} 쓰기`}
                    onClick={() => setEditingStep(s)}
                    className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-baro-blue-50 px-3.5 text-body-3 font-bold text-baro-blue-600"
                  >
                    <Pencil aria-hidden className="size-4" />
                    쓰기
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <Button type="button" variant="outline" className={`${secondaryButtonClass} mt-6 w-full`} onClick={onClose}>
        닫기
      </Button>
    </div>
  );
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-3.5 text-body-3 font-bold text-slate-600"
    >
      <Pencil aria-hidden className="size-4" />
      고치기
    </button>
  );
}

/* 저장된 경험의 한 칸만 크게 열어 고친다. 저장하면 그 칸만 바로 저장하고 읽기 화면으로 돌아간다. */
function FieldEditor({
  item,
  step,
  onCancel,
  onSaved,
  onClose,
  registerGuard,
}: {
  item: ExperienceBankItem;
  step: Step;
  onCancel: () => void;
  onSaved: (item: ExperienceBankItem) => void;
  /** 창 전체를 닫는다(닫을 때 저장할지 물은 뒤). */
  onClose: () => void;
  registerGuard: RegisterGuard;
}) {
  const original = toForm(item)[step.key];
  const [value, setValue] = useState(original);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isSaving, startSave] = useTransition();
  useCloseGuard(registerGuard, value !== original, () => setConfirming((c) => !c));

  /** closeAfter 이면 저장한 뒤 읽기 화면이 아니라 창을 닫는다(닫으려다 저장을 고른 경우). */
  function handleSave(closeAfter = false) {
    if (step.key === "title" && !value.trim()) {
      setConfirming(false);
      setError("경험 제목을 입력해주세요.");
      return;
    }
    startSave(async () => {
      try {
        setError(null);
        const updated = await updateExperienceBankItemAction(item.id, { [step.key]: value });
        if (!updated) {
          setError("저장에 실패했습니다.");
          return;
        }
        onSaved(updated);
        if (closeAfter) onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  if (confirming) {
    return (
      <CloseConfirm
        title="고친 내용을 저장할까요?"
        message="저장하지 않고 닫으면 고친 내용은 사라져요."
        keepLabel="계속 고치기"
        isSaving={isSaving}
        error={error}
        onSave={() => handleSave(true)}
        onDiscard={onClose}
        onKeep={() => setConfirming(false)}
      />
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <DialogHeader>
        <DialogTitle className={`${smallTitleClass} break-keep`}>{item.title} · 고치기</DialogTitle>
        <DialogDescription className="sr-only">이 칸만 고쳐서 저장해요.</DialogDescription>
      </DialogHeader>
      <QuestionField
        step={step}
        value={value}
        onChange={(v) => {
          setError(null);
          setValue(v);
        }}
        error={error}
      />
      <div className="mt-7 flex gap-2">
        <Button type="button" variant="outline" className={secondaryButtonClass} onClick={onCancel} disabled={isSaving}>
          취소
        </Button>
        <Button type="submit" className={primaryButtonClass} disabled={isSaving}>
          {isSaving && <Loader2 className="size-5 animate-spin" />}
          저장
        </Button>
      </div>
    </form>
  );
}
