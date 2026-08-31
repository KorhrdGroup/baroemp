"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Check,
  FileText,
  HeartHandshake,
  Loader2,
  Sparkles,
  ThumbsUp,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EXTRA_SECTION_CODES, type ResumeSectionOption } from "@/lib/resume/completeness";
import { createResumeAction } from "./resume-actions";

type Step = "template" | "sections" | "prefill";

/*
  양식 카드의 겉모습. 양식은 관리자가 늘릴 수 있어 이름으로 짝지을 수 없으므로
  차례대로 돌려 쓴다. 무슨 양식인지는 카드에 적힌 이름과 설명이 말한다.
*/
const TEMPLATE_CARD_STYLES = [
  { icon: FileText, tone: "bg-slate-50", iconTone: "text-slate-500" },
  { icon: Briefcase, tone: "bg-sky-50", iconTone: "text-brand-blue-600" },
  { icon: UserRound, tone: "bg-violet-50", iconTone: "text-violet-500" },
  { icon: HeartHandshake, tone: "bg-emerald-50", iconTone: "text-emerald-600" },
];

/** 기본정보는 이력서가 이력서이기 위한 최소한이라 뺄 수 없다. */
const FIXED_SECTION = "BASIC_INFO";

/** 프로젝트·봉사·수상은 한 줄로 묶여 있어, 어느 코드든 그 줄의 키로 바꿔 다룬다. */
function sectionKey(code: string): string {
  return (EXTRA_SECTION_CODES as string[]).includes(code) ? "ACTIVITY" : code;
}

export interface WizardResumeTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  sections: string[];
}

/** 작성 시작 화면에서 보여줄 "불러올 내 정보". 서버가 실제로 채울 값과 같은 곳에서 온다. */
export interface PrefillPreview {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  desiredJobTitle?: string;
  qualifications: string[];
  skills: string[];
}

type PrefillPartKey = "basicInfo" | "desired" | "qualifications" | "skills";

/* ── 화면 조각 ──────────────────────────────────────────────────────────── */

function StepHeader({ step, title, description }: { step: 1 | 2; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        {[1, 2].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-label-2 font-bold",
                n <= step ? "bg-brand-blue-600 text-white" : "bg-slate-200 text-slate-400",
              )}
            >
              {n < step ? <Check className="size-4" /> : n}
            </span>
            {n === 1 && <span className={cn("h-px w-10", step > 1 ? "bg-brand-blue-600" : "bg-slate-200")} />}
          </div>
        ))}
      </div>
      <h1 className="mt-5 text-title-2 font-bold text-slate-900">{title}</h1>
      <p className="mt-2 whitespace-pre-line text-body-2 text-slate-500">{description}</p>
    </div>
  );
}

function WizardCard({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 sm:p-10">{children}</div>;
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <Label className="text-body-2 font-bold text-slate-900">{children}</Label>
      {hint && <p className="mt-1 text-label-1 text-slate-500">{hint}</p>}
    </div>
  );
}

/* ── 본체 ──────────────────────────────────────────────────────────────── */

export function ResumeWizard({
  templates,
  sectionOptions,
  prefill,
  initialTitle,
  targetJobId,
  targetOccupationId,
}: {
  templates: WizardResumeTemplate[];
  /** 고를 수 있는 항목 전체(모든 양식의 항목을 모은 것) */
  sectionOptions: ResumeSectionOption[];
  prefill: PrefillPreview;
  initialTitle?: string;
  targetJobId?: string;
  targetOccupationId?: string;
}) {
  const router = useRouter();
  const firstTemplate = templates[0];

  const [step, setStep] = useState<Step>("template");
  const [templateId, setTemplateId] = useState(firstTemplate.id);
  const [sections, setSections] = useState<string[]>(firstTemplate.sections);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [isCreating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId) ?? firstTemplate;
  /** 앞 화면의 양식 카드와 같은 아이콘·색. 카드가 차례대로 돌려 쓰므로 자리로 찾는다. */
  const templateStyle =
    TEMPLATE_CARD_STYLES[Math.max(0, templates.findIndex((t) => t.id === template.id)) % TEMPLATE_CARD_STYLES.length];

  /*
    불러올 정보는 실제로 가진 것만 보여준다. 빈 항목을 켜고 끄게 해봐야
    켜도 아무것도 안 들어온다.
  */
  const prefillParts = ([
    {
      key: "basicInfo",
      label: "이름과 연락처",
      detail: [prefill.name, prefill.phone, prefill.email, prefill.address].filter(Boolean).join(" · "),
    },
    { key: "desired", label: "희망 직무", detail: prefill.desiredJobTitle ?? "" },
    {
      key: "qualifications",
      label: `보유 자격 ${prefill.qualifications.length}개`,
      detail: prefill.qualifications.slice(0, 5).join(" · "),
    },
    { key: "skills", label: `보유 스킬 ${prefill.skills.length}개`, detail: prefill.skills.slice(0, 5).join(" · ") },
  ] satisfies { key: PrefillPartKey; label: string; detail: string }[]).filter((part) => part.detail.length > 0);

  const [excludedParts, setExcludedParts] = useState<PrefillPartKey[]>([]);

  /*
    단계를 넘길 때 맨 위로 올린다. 다음 버튼은 화면 아래에 있어서, 그냥 두면
    새 단계의 제목이 화면 위로 지나가 버리고 바닥부터 보인다.
  */
  function goToStep(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  /** 양식을 고르면 그 양식의 항목을 담아 1단계로 넘어간다. */
  function startWithTemplate(next: WizardResumeTemplate) {
    setTemplateId(next.id);
    setSections(next.sections);
    goToStep("sections");
  }

  /** 한 줄이 여러 코드를 함께 다룰 수 있어(봉사·수상) 담고 뺄 때 그 줄 전체를 다룬다. */
  function isSectionPicked(option: ResumeSectionOption) {
    return option.codes.some((c) => sections.includes(c));
  }

  /*
    항목의 제자리. 고른 양식이 정한 순서를 먼저 놓고, 그 양식에 없는 항목을 목록 순서로 잇는다.
    편집 화면의 항목 목록과 같은 규칙이라, 두 화면에서 같은 항목이 같은 자리에 선다.
  */
  const sectionOrder = useMemo(() => {
    const all = sectionOptions.map((o) => o.code);
    const fromTemplate = template.sections.map(sectionKey).filter((key) => all.includes(key));
    return [...new Set([...fromTemplate, ...all])];
  }, [template, sectionOptions]);

  function toggleSection(option: ResumeSectionOption) {
    if (option.code === FIXED_SECTION) return;
    setSections((prev) => {
      if (isSectionPicked(option)) return prev.filter((c) => !option.codes.includes(c));
      /*
        담을 때 제자리로 넣는다. 뒤에 붙이면 뺐다가 다시 담은 항목이 목록 끝으로 가서,
        양식이 정한 순서가 손댄 항목 하나 때문에 무너진다.
      */
      const next = [...prev, option.code];
      return sectionOrder.flatMap((key) => next.filter((c) => sectionKey(c) === key));
    });
  }

  function handleCreate() {
    setError(null);
    startCreate(async () => {
      try {
        const detail = await createResumeAction({
          templateId,
          title: title.trim() || undefined,
          targetJobId,
          targetOccupationId,
          // 기본정보는 목록에서 빠져 있어도 반드시 담는다.
          sectionCodes: sections.includes(FIXED_SECTION) ? sections : [FIXED_SECTION, ...sections],
          include: {
            basicInfo: !excludedParts.includes("basicInfo"),
            desired: !excludedParts.includes("desired"),
            qualifications: !excludedParts.includes("qualifications"),
            skills: !excludedParts.includes("skills"),
          },
        });
        router.replace(`/resume/${detail.resume.id}/edit`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "이력서를 만들지 못했습니다.");
      }
    });
  }

  /* ── 양식 고르기 ───────────────────────────────────────────────────────── */

  if (step === "template") {
    return (
      <div>
        <div className="text-center">
          <Sparkles className="mx-auto size-8 text-brand-blue-400" />
          <h1 className="mt-5 text-title-2 font-bold text-slate-900 sm:text-headline-3">
            어떤 이력서를 만들까요?
          </h1>
          <p className="mt-3 text-body-2 text-slate-500">
            골라주시면 그에 맞는 항목을 미리 담아드려요. 항목은 다음 단계에서 바꿀 수 있어요.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((t, idx) => {
            const style = TEMPLATE_CARD_STYLES[idx % TEMPLATE_CARD_STYLES.length];
            const Icon = style.icon;
            return (
              <div key={t.id} className={cn("flex flex-col rounded-2xl p-5 text-center sm:p-6", style.tone)}>
                <div className="flex justify-center">
                  <Icon className={cn("size-7", style.iconTone)} />
                </div>
                <p className="mt-4 break-keep text-body-1 font-bold text-slate-900">{t.name}</p>
                {/* break-keep 이 없으면 한글이 음절 단위로 잘려 "이력서입니 / 다." 처럼 끊긴다. */}
                <p className="mt-2 flex-1 break-keep text-body-2 leading-relaxed text-slate-600">{t.description}</p>
                <p className="mt-3 text-label-2 text-slate-500">항목 {t.sections.length}개</p>
                {/* 좁은 화면에서는 카드 폭을 채운다. 가운데 뜬 작은 알약은 손가락으로 겨누기 어렵다. */}
                <Button className="mt-4 h-11 self-stretch rounded-full px-7 sm:self-center" onClick={() => startWithTemplate(t)}>
                  시작하기
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button variant="ghost" size="sm" className="text-slate-500" asChild>
            <Link href="/resume">
              <ArrowLeft className="size-4" /> 목록으로
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── 1단계: 항목 고르기 ───────────────────────────────────────────────── */

  if (step === "sections") {
    /* 아래 미리보기는 저장될 순서 그대로 보여준다. 목록 순서로 세우면 "항목 2"라고 적힌 것이 이력서에서는 마지막에 온다. */
    const picked = sectionOrder
      .map((key) => sectionOptions.find((o) => o.code === key))
      .filter((option) => option !== undefined)
      .filter(isSectionPicked);

    return (
      <WizardCard>
        <StepHeader
          step={1}
          title="항목 고르기"
          description="이력서에 담을 항목을 골라주세요. 나중에 편집 화면에서도 바꿀 수 있어요."
        />
        <div className="mt-10 space-y-8">
          {/*
            앞 화면에서 고른 양식. 지금 무엇을 바탕으로 항목이 담겼는지 알아야 손볼 수 있다.
            가운데 뜬 한 줄로 두면 제목의 꼬리처럼 읽혀서, 아래 항목들과 같은 섹션으로 세운다.
            아이콘은 앞 화면에서 누른 카드와 같은 것을 쓴다 - 방금 고른 그것이라는 표시다.
          */}
          <div>
            <FieldLabel>고른 양식</FieldLabel>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", templateStyle.tone)}>
                <templateStyle.icon className={cn("size-4", templateStyle.iconTone)} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-label-1 font-semibold text-slate-900">{template.name}</p>
                {template.description && (
                  <p className="mt-0.5 truncate text-label-2 text-slate-500">{template.description}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-slate-600"
                onClick={() => goToStep("template")}
              >
                변경하기
              </Button>
            </div>
          </div>

          <div>
            <FieldLabel hint="뺀 항목은 이력서에 나오지 않고, 완성도에도 세지 않아요.">이력서 항목</FieldLabel>

            {/*
              고를 수 있는 항목이 여덟이라, 담긴 것을 진한 파랑으로 채우면 화면이 파랑 덩어리가 된다.
              바탕을 흰색으로 내리고, 담김 표시는 연한 파랑 배경 + 테두리 + 글자색으로 한다.
            */}
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-label-1 font-semibold text-slate-700">담을 수 있는 항목</p>
              <p className="mt-1 flex items-center gap-1 text-label-2 text-slate-500">
                <ThumbsUp className="size-3.5" /> 표시는 고르신 이력서에서 보통 담는 항목이에요.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sectionOptions.map((option) => {
                  const isPicked = isSectionPicked(option);
                  const recommended = option.codes.some((c) => template.sections.includes(c));
                  const fixed = option.code === FIXED_SECTION;
                  return (
                    <button
                      key={option.code}
                      type="button"
                      disabled={fixed}
                      onClick={() => toggleSection(option)}
                      aria-pressed={isPicked}
                      className={cn(
                        "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-label-1 transition-colors",
                        fixed ? "cursor-default" : "cursor-pointer",
                        isPicked
                          ? "border-brand-blue-400 bg-brand-blue-50 font-medium text-brand-blue-700"
                          : "border-border bg-white text-slate-600 hover:border-brand-blue-200 hover:bg-slate-50",
                      )}
                    >
                      {recommended && <ThumbsUp className="size-3.5" />}
                      {option.label}
                      {fixed && <span className="text-label-2 opacity-70">(필수)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 divide-y divide-border rounded-xl border border-border">
              {picked.map((option, idx) => (
                <div key={option.code} className="flex items-center gap-3 px-4 py-3">
                  <span className="shrink-0 text-label-1 font-bold text-slate-400">항목 {idx + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-label-1 text-slate-700">
                    {option.label}
                    {!option.required && <span className="ml-2 text-label-2 text-slate-400">없어도 괜찮아요</span>}
                  </span>
                  {option.code === FIXED_SECTION ? (
                    /* 편집 화면 항목 목록의 "필수"와 같은 색을 쓴다. */
                    <span className="shrink-0 px-3 text-label-2 text-brand-blue-300">필수</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-slate-500"
                      onClick={() => toggleSection(option)}
                    >
                      <Trash2 className="size-3.5" /> 삭제
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel hint="비워두면 편집 화면에서 정할 수 있어요.">이력서 이름 (선택)</FieldLabel>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 요양보호사 지원용 이력서"
              className="h-12 bg-white"
            />
          </div>
        </div>

        <div className="mt-10 flex justify-center gap-3">
          <Button variant="outline" className="h-12 min-w-32 rounded-full" onClick={() => goToStep("template")}>
            이전
          </Button>
          <Button className="h-12 min-w-32 rounded-full" onClick={() => goToStep("prefill")}>
            다음
          </Button>
        </div>
      </WizardCard>
    );
  }

  /* ── 2단계: 불러올 내 정보 ────────────────────────────────────────────── */

  return (
    <WizardCard>
      <StepHeader
        step={2}
        title="이미 적어두신 정보 불러오기"
        description={"가입할 때와 직업진단에서 받은 정보예요.\n불러오면 그만큼 덜 쓰셔도 됩니다. 불러온 뒤에도 편집 화면에서 고칠 수 있어요."}
      />

      <div className="mt-10">
        {prefillParts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-slate-50 p-10 text-center">
            <p className="text-body-2 text-slate-600">
              아직 불러올 정보가 없어요. 편집 화면에서 직접 채우시면 됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {prefillParts.map((part) => {
              const included = !excludedParts.includes(part.key);
              return (
                <button
                  key={part.key}
                  type="button"
                  aria-pressed={included}
                  onClick={() =>
                    setExcludedParts((prev) =>
                      included ? [...prev, part.key] : prev.filter((k) => k !== part.key),
                    )
                  }
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    included
                      ? "border-brand-blue-600 bg-brand-blue-50"
                      : "border-border bg-white hover:border-brand-blue-200",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                      included ? "border-brand-blue-600 bg-brand-blue-600" : "border-slate-300",
                    )}
                  >
                    {included && <Check className="size-3.5 text-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body-2 font-semibold text-slate-900">{part.label}</span>
                    <span className="mt-0.5 block truncate text-label-1 text-slate-500">{part.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="mt-4 text-center text-label-1 text-rose-600">{error}</p>}
      </div>

      <div className="mt-10 flex justify-center gap-3">
        <Button
          variant="outline"
          className="h-12 min-w-32 rounded-full"
          disabled={isCreating}
          onClick={() => goToStep("sections")}
        >
          이전
        </Button>
        <Button className="h-12 min-w-44 rounded-full" disabled={isCreating} onClick={handleCreate}>
          {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          이력서 만들기
        </Button>
      </div>
    </WizardCard>
  );
}
