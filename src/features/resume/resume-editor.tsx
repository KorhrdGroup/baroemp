"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Eye, Loader2, Minus, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveResumeAgent, type ResumeAgentOption } from "./resume-agents";
import {
  EXTRA_SECTION_CODES,
  isRequiredSection,
  isSectionFilled,
  resolveResumeSections,
  type ResumeSectionOption,
} from "@/lib/resume/completeness";
import { AiButton } from "@/components/common/ai-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import type {
  AIResumeReviewResult,
  ResumeDetail,
  ResumeEducationInput,
  ResumeExperienceInput,
  ResumeItemInput,
  ResumeItemSectionType,
  ResumeMarketComparisonView,
  ResumeQualificationInput,
  ResumeSkillInput,
  ResumeTrainingInput,
} from "@/types";
import {
  changeResumeTemplateAction,
  generateCareerSummaryAiAction,
  getResumeMarketComparisonAction,
  reviewResumeAiAction,
  rewriteResumeSectionAiAction,
  saveResumeAction,
  trackResumeExportedAction,
} from "./resume-actions";
import { calculateResumeCompleteness } from "@/lib/resume/completeness";
import { ResumePreview } from "./resume-preview";
import { MarketComparisonCard } from "@/features/career-gap/market-comparison-card";
import { cn } from "@/lib/utils";
import { REGION_LABELS } from "@/lib/labels";

let keySeq = 0;
function nextKey(prefix: string) {
  keySeq += 1;
  return `${prefix}-${keySeq}`;
}

type EditableEducation = ResumeEducationInput & { _key: string };
type EditableExperience = ResumeExperienceInput & { _key: string };
type EditableQualification = ResumeQualificationInput & { _key: string };
type EditableTraining = ResumeTrainingInput & { _key: string };
type EditableSkill = ResumeSkillInput & { _key: string };
type EditableItem = ResumeItemInput & { _key: string };

function withKeys<T>(items: T[], prefix: string): (T & { _key: string })[] {
  return items.map((item) => ({ ...item, _key: nextKey(prefix) }));
}

/** _key는 React 리스트 렌더링용 로컬 식별자일 뿐이라 서버로 보낼 때는 제거한다. */
function stripKey<T extends { _key: string }>(item: T): Omit<T, "_key"> {
  const rest: Record<string, unknown> = { ...item };
  delete rest._key;
  return rest as Omit<T, "_key">;
}

/** 입사/퇴사/입학/졸업은 연월까지만 받는다. DB date(YYYY-MM-DD) 값도 month input에 맞게 자른다. */
function toMonth(value?: string): string {
  return value ? value.slice(0, 7) : "";
}

/** month input의 연월(YYYY-MM) 값은 1일로 보정해 DB date 컬럼에 저장한다. */
function toDbDate(value?: string): string | undefined {
  if (!value) return undefined;
  return value.length === 7 ? `${value}-01` : value;
}

/** 요약 카드에서 기간을 "2020.03 - 2024.11" 형태로 보여준다. */
function periodLabel(start?: string, end?: string, isCurrent?: boolean): string {
  const dot = (v?: string) => (v ? v.slice(0, 7).replace("-", ".") : "");
  const s = dot(start);
  const e = isCurrent ? "재직중" : dot(end);
  return [s, e].filter(Boolean).join(" - ");
}

/**
 * 학교구분. 고등학교는 입학년월·전공 없이 졸업 정보만 받는다.
 * 검정고시는 별도 구분이 아니라 고등학교 행의 체크박스로 표현하고, 저장은 educationType="검정고시"로 한다.
 */
const EDUCATION_TYPES = ["고등학교", "전문대학(2·3년)", "대학교(4년)", "대학원(석사)", "대학원(박사)"] as const;
const GED_TYPE = "검정고시";
const GED_SCHOOL_NAME = "대입자격검정고시";
const SIMPLE_EDUCATION_TYPES = new Set<string>(["고등학교", GED_TYPE]);
const GRADUATION_STATUSES = ["졸업", "졸업예정", "재학중", "휴학", "중퇴", "수료"] as const;

/**
 * "기타" 항목의 종류. 자주 쓰는 것을 앞에 둔다.
 * 교육 이수는 여기 두지 않는다 - 전용 "교육/훈련" 섹션이 과정명과 교육기관을
 * 따로 받으므로, 여기에도 두면 같은 내용을 두 군데 쓰게 된다.
 */
/** 봉사·수상 카드 한 줄(PROJECT + ACTIVITY)을 목록에서 가리키는 이름. */
const EXTRA_SECTION_KEY = "EXTRA";

/** 사이드바에서 카드로 내려갈 때 쓰는 자리 이름. */
function sectionAnchorId(key: string) {
  return `resume-section-${key}`;
}

const ITEM_SECTION_LABELS: Record<ResumeItemSectionType, string> = {
  AWARD: "수상",
  VOLUNTEER: "봉사활동",
  LANGUAGE: "외국어",
  ACTIVITY: "대외활동",
  PROJECT: "프로젝트",
};

/**
 * 저장에 보내는 값. 변경 여부 판단도 이 값으로 한다.
 * 판단용 데이터를 따로 만들면 저장 형식이 바뀔 때 둘이 어긋난다.
 *
 * 처음 그린 값으로도 한 번 만들어야 해서(저장할 것이 있는지 재는 기준점) 화면 상태를
 * 안에서 읽지 않고 인자로 받는다.
 */
interface ResumeFormState {
  title: string;
  summary: string;
  desiredJobTitle: string;
  desiredRegion: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  portfolioUrl: string;
  hasNoWorkExperience: boolean;
}

function buildResumeSavePayload(source: {
  id: string;
  form: ResumeFormState;
  sectionCodes: string[];
  educations: EditableEducation[];
  experiences: EditableExperience[];
  qualifications: EditableQualification[];
  trainings: EditableTraining[];
  skills: EditableSkill[];
  items: EditableItem[];
}) {
  return {
    resume: { id: source.id, ...source.form, sectionCodes: source.sectionCodes },
    educations: source.educations.map((e) => ({
      ...stripKey(e),
      admissionDate: toDbDate(e.admissionDate),
      graduationDate: toDbDate(e.graduationDate),
    })),
    experiences: source.experiences.map((e) => ({
      ...stripKey(e),
      startDate: toDbDate(e.startDate),
      endDate: toDbDate(e.endDate),
    })),
    qualifications: source.qualifications.map(stripKey),
    trainings: source.trainings.map(stripKey),
    skills: source.skills.map(stripKey),
    items: source.items.map(stripKey),
  };
}

export function ResumeEditor({
  initialDetail,
  templates = [],
  sectionOptions = [],
}: {
  initialDetail: ResumeDetail;
  templates?: ResumeAgentOption[];
  /** 담을 수 있는 항목 전체. 편집 중에도 항목을 넣고 뺄 수 있게 한다. */
  sectionOptions?: ResumeSectionOption[];
}) {
  const [detail, setDetail] = useState(initialDetail);
  const resume = detail.resume;

  /*
    사이드바에 세우는 자리. 담을 수 있는 항목이 전부 한 줄씩 들어간다.
    봉사·수상 카드 하나가 PROJECT와 ACTIVITY 둘을 함께 받으므로 그 둘은 한 자리로 묶는다.
  */
  const slots = useMemo(
    () =>
      sectionOptions.map((option) => ({
        key: EXTRA_SECTION_CODES.includes(option.code) ? EXTRA_SECTION_KEY : option.code,
        label: option.label,
        codes: option.codes,
      })),
    [sectionOptions],
  );

  /*
    자리의 순서. 담기고 빠지는 것과 따로 둔다. 담긴 것만 들고 있으면 항목을 뺄 때마다
    그 줄이 목록 끝으로 튀어, 방금 무엇을 뺐는지 눈으로 쫓아야 한다.

    이력서에 담긴 순서를 먼저 놓고, 아직 안 담은 항목을 그 뒤에 잇는다.
  */
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    const chosen = resolveResumeSections(initialDetail).map((code) =>
      EXTRA_SECTION_CODES.includes(code) ? EXTRA_SECTION_KEY : code,
    );
    const all = sectionOptions.map((o) =>
      EXTRA_SECTION_CODES.includes(o.code) ? EXTRA_SECTION_KEY : o.code,
    );
    return [...new Set([...chosen.filter((k) => all.includes(k)), ...all])];
  });

  /** 지금 이력서에 담긴 자리. */
  const [includedKeys, setIncludedKeys] = useState<string[]>(() => {
    const chosen = resolveResumeSections(initialDetail);
    return [
      ...new Set(chosen.map((code) => (EXTRA_SECTION_CODES.includes(code) ? EXTRA_SECTION_KEY : code))),
    ];
  });

  /** 담긴 항목만, 자리 순서대로. 오른쪽 카드도 이 순서로 그린다. */
  const navItems = useMemo(
    () =>
      sectionOrder
        .filter((key) => includedKeys.includes(key))
        .map((key) => slots.find((s) => s.key === key))
        .filter((slot) => slot !== undefined),
    [sectionOrder, includedKeys, slots],
  );

  /** 저장할 항목 코드. 자리 순서를 그대로 따른다. */
  const sectionCodes = navItems.flatMap((item) => item.codes);

  /** 기본정보는 맨 위에 고정이라, 그 아래부터 자리를 옮길 수 있다. */
  const firstMovableIndex = navItems.findIndex((i) => !i.codes.includes("BASIC_INFO"));

  function addSectionRow(row: { key: string }) {
    setIncludedKeys((prev) => [...prev, row.key]);
  }

  /** 사이드바에서 누른 항목으로 내려간다. 항목이 다 펼쳐져 있으므로 감추는 대신 옮겨준다. */
  function scrollToSection(key: string) {
    document.getElementById(sectionAnchorId(key))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /**
   * 항목 빼기. 줄은 자리를 지키고 담김 표시만 풀린다.
   * 적어둔 내용도 지우지 않아 다시 담으면 그대로 있다.
   */
  function removeSectionItem(item: { key: string }) {
    setIncludedKeys((prev) => prev.filter((k) => k !== item.key));
  }

  /** 항목 순서 옮기기. 담긴 항목끼리의 순서를 바꾼다 - 화면 목록과 인쇄물이 이 순서를 따른다. */
  function moveSectionItem(item: { key: string }, direction: -1 | 1) {
    const target = navItems[navItems.findIndex((i) => i.key === item.key) + direction];
    if (!target || target.codes.includes("BASIC_INFO")) return;
    setSectionOrder((prev) => {
      const from = prev.indexOf(item.key);
      const to = prev.indexOf(target.key);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  /** 순서를 바꾸는 중인지. 켜면 담긴 항목마다 위/아래 버튼이 나온다. */
  const [reordering, setReordering] = useState(false);

  /*
    좁은 화면용 항목 띠. 목차(사이드바)는 스크롤하면 지나가 버려, 본문 한가운데서는
    지금 어느 항목을 채우고 있는지도, 다른 항목으로 건너갈 길도 없었다.
    헤더 밑에 항목 이름 띠를 붙여 두고, 스크롤 위치로 지금 항목을 표시한다.
  */
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      /* 띠(헤더 64 + 띠 높이) 바로 아래 지점을 지나는 카드가 "지금 항목"이다. */
      const line = 120;
      let current: string | null = null;
      for (const item of navItems) {
        const el = document.getElementById(sectionAnchorId(item.key));
        if (el && el.getBoundingClientRect().top <= line) current = item.key;
      }
      /* 페이지 끝은 더 밀 수 없어, 마지막 항목들은 저 선을 영영 넘지 못한다. 끝에 닿으면 마지막 항목으로 본다. */
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) current = navItems.at(-1)?.key ?? current;
      /* 맨 위에서는 아직 아무 카드도 선을 넘지 않았다. 그래도 띠는 어디 있는지 늘 짚어 준다. */
      if (!current) current = navItems[0]?.key ?? null;
      setActiveSectionKey((prev) => (prev === current ? prev : current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [navItems]);

  /*
    지금 항목이 띠 밖에 있으면 띠를 따라 옮겨, 표시가 늘 보이게 한다.
    scrollIntoView 는 쓰지 않는다 - 가로로 옮기면서 세로까지 건드려, 사용자가 내리는
    페이지를 도로 끌어올려 표시가 제자리에서 맴돌았다. 띠의 가로 위치만 직접 옮긴다.
  */
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !activeSectionKey) return;
    const btn = strip.querySelector<HTMLElement>(`[data-strip-key="${activeSectionKey}"]`);
    if (!btn) return;
    const left = btn.offsetLeft - (strip.clientWidth - btn.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeSectionKey]);
  /** 점검 기준(에이전트)을 고르는 창. 열 때 지금 기준을 미리 골라둔다. */
  const [reviewPickerOpen, setReviewPickerOpen] = useState(false);
  const [pickedAgentId, setPickedAgentId] = useState<string | undefined>(initialDetail.resume.templateId);

  const [isChangingTemplate, startTemplateChange] = useTransition();

  /*
    처음 값은 한 번만 만든다. 상태와 "저장할 것이 있는지" 재는 기준점이 같은 값에서
    나와야, 열자마자 고친 것도 없는데 저장 버튼이 켜져 있는 일이 없다.
  */
  const initial = useMemo(
    () => ({
      form: {
        title: initialDetail.resume.title,
        summary: initialDetail.resume.summary ?? "",
        desiredJobTitle: initialDetail.resume.desiredJobTitle ?? "",
        desiredRegion: initialDetail.resume.desiredRegion ?? "",
        name: initialDetail.resume.name ?? "",
        email: initialDetail.resume.email ?? "",
        phone: initialDetail.resume.phone ?? "",
        address: initialDetail.resume.address ?? "",
        portfolioUrl: initialDetail.resume.portfolioUrl ?? "",
        hasNoWorkExperience: initialDetail.resume.hasNoWorkExperience ?? false,
      },
      educations: withKeys(initialDetail.educations, "edu"),
      experiences: withKeys(initialDetail.experiences, "exp"),
      qualifications: withKeys(initialDetail.qualifications, "qual"),
      trainings: withKeys(initialDetail.trainings, "train"),
      skills: withKeys(initialDetail.skills, "skill"),
      items: withKeys(initialDetail.items, "item"),
    }),
    [initialDetail],
  );

  const [form, setForm] = useState<ResumeFormState>(initial.form);
  const [educations, setEducations] = useState<EditableEducation[]>(initial.educations);
  const [experiences, setExperiences] = useState<EditableExperience[]>(initial.experiences);
  const [qualifications, setQualifications] = useState<EditableQualification[]>(initial.qualifications);
  const [trainings, setTrainings] = useState<EditableTraining[]>(initial.trainings);
  const [skills, setSkills] = useState<EditableSkill[]>(initial.skills);
  const [items, setItems] = useState<EditableItem[]>(initial.items);
  const [skillDraft, setSkillDraft] = useState("");

  /**
   * 한 줄 소개를 만들 재료가 있는지. AI 는 경력·자격·스킬을 읽어 문장을 만든다
   * (generateCareerSummaryWithAI). 셋 다 비어 있으면 만들 것이 없다.
   */
  const hasSummaryMaterial = experiences.length + qualifications.length + skills.length > 0;


  /**
   * 경력/학력 항목의 편집 상태. 작성이 끝난 항목은 폼 대신 정리된 요약 카드로 보여주고,
   * 연필을 눌렀거나 방금 추가한 항목만 폼을 펼친다.
   */
  const [editingEntries, setEditingEntries] = useState<Set<string>>(new Set());
  const isEntryEditing = (key: string) => editingEntries.has(key);
  function setEntryEditing(key: string, on: boolean) {
    setEditingEntries((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  const [isSaving, startSave] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // 미리보기는 입력 폭을 좁히지 않도록 팝업으로 띄운다.
  const [previewOpen, setPreviewOpen] = useState(false);
  /** 마지막으로 저장한 내용. 지금 입력과 이 값을 비교해 저장할 것이 있는지 본다. */
  const [savedPayload, setSavedPayload] = useState(() =>
    JSON.stringify(
      buildResumeSavePayload({ id: initialDetail.resume.id, sectionCodes, ...initial }),
    ),
  );

  const [reviewResult, setReviewResult] = useState<AIResumeReviewResult | null>(null);
  const [marketComparison, setMarketComparison] = useState<ResumeMarketComparisonView | null>(null);
  const [isReviewing, startReview] = useTransition();
  const marketComparisonRequestRef = useRef(0);
  const [summarySuggestion, setSummarySuggestion] = useState<string | null>(null);
  const [isGeneratingSummary, startGenerateSummary] = useTransition();
  const [rewriteTarget, setRewriteTarget] = useState<{ key: string; field: "responsibilities" | "achievements"; text: string } | null>(null);
  const [isRewriting, startRewrite] = useTransition();
  /** 지금 다듬는 중인 칸. 스피너는 누른 버튼에만 보여주고 나머지는 비활성화만 한다. */
  const [rewritePending, setRewritePending] = useState<{ key: string; field: string } | null>(null);

  function currentPreviewDetail(): ResumeDetail {
    return {
      ...detail,
      resume: { ...resume, ...form, sectionCodes },
      educations: educations.map((e) => ({ ...e, id: e._key, resumeId: resume.id, orderIndex: e.orderIndex ?? 0 })),
      experiences: experiences.map((e) => ({
        ...e,
        id: e._key,
        resumeId: resume.id,
        isCurrent: e.isCurrent ?? false,
        orderIndex: e.orderIndex ?? 0,
      })),
      qualifications: qualifications.map((q) => ({ ...q, id: q._key, resumeId: resume.id, orderIndex: q.orderIndex ?? 0 })),
      trainings: trainings.map((t) => ({ ...t, id: t._key, resumeId: resume.id, orderIndex: t.orderIndex ?? 0 })),
      skills: skills.map((s) => ({ ...s, id: s._key, resumeId: resume.id, orderIndex: s.orderIndex ?? 0 })),
      items: items.map((i) => ({ ...i, id: i._key, resumeId: resume.id, orderIndex: i.orderIndex ?? 0 })),
    } as ResumeDetail;
  }

  /*
    완성도는 저장할 때 서버가 다시 계산하지만, 채우는 즉시 반응해야 진행이 보인다.
    서버와 같은 함수(calculateResumeCompleteness)에 현재 입력값을 그대로 넣어
    두 값이 어긋나지 않게 한다. 가중치가 0인 항목(프로젝트·대외활동)은 애초에
    빠져 있어 필수 항목만 센다.
  */
  const livePreview = currentPreviewDetail();
  const liveCompleteness = calculateResumeCompleteness(livePreview);

  /**
   * 항목 목록의 체크 표시.
   * 완성도에 세지 않는 항목(봉사·수상 등)은 채웠는지 물을 기준이 없으므로 적힌 것이 있으면 채운 것으로 본다.
   */
  function isNavItemFilled(item: { key: string; codes: string[] }): boolean {
    if (item.key === EXTRA_SECTION_KEY) return items.length > 0;
    if (!isRequiredSection(item.key)) return false;
    return isSectionFilled(item.key, livePreview);
  }

  /**
   * 사이드바에 세우는 줄. 담을 수 있는 항목이 전부, 자리 순서 그대로 들어간다.
   * 뺀 항목도 그 자리에 남는다 - 줄이 목록 끝으로 튀면 방금 무엇을 뺐는지 눈으로 쫓아야 한다.
   */
  const sectionRows = sectionOrder
    .map((key) => slots.find((s) => s.key === key))
    .filter((slot) => slot !== undefined)
    .map((slot) => {
      const navIndex = navItems.findIndex((i) => i.key === slot.key);
      const included = navIndex >= 0;
      return {
        ...slot,
        included,
        order: navIndex + 1,
        navIndex,
        fixed: slot.codes.includes("BASIC_INFO"),
        filled: included && isNavItemFilled(slot),
      };
    });

  /*
    마지막으로 저장한 내용과 지금 입력이 같으면 저장할 것이 없다.
    누를 수는 있는데 아무 일도 안 일어나면 저장이 안 된 건지 헷갈린다.
  */
  const isDirty = JSON.stringify(buildSavePayload()) !== savedPayload;

  /** 지금 화면에 있는 값으로 저장 payload 를 만든다. */
  function buildSavePayload() {
    return buildResumeSavePayload({
      id: resume.id,
      form,
      sectionCodes,
      educations,
      experiences,
      qualifications,
      trainings,
      skills,
      items,
    });
  }

  function handleSave(): Promise<ResumeDetail> {
    return new Promise((resolve, reject) => {
      startSave(async () => {
        try {
          const payload = buildSavePayload();
          const saved = await saveResumeAction(payload);
          setDetail(saved);
          setEducations(withKeys(saved.educations, "edu"));
          setExperiences(withKeys(saved.experiences, "exp"));
          setQualifications(withKeys(saved.qualifications, "qual"));
          setTrainings(withKeys(saved.trainings, "train"));
          setSkills(withKeys(saved.skills, "skill"));
          setItems(withKeys(saved.items, "item"));
          /*
            기준점은 화면 상태가 아니라 서버가 돌려준 값으로 잡는다. 이 시점에는
            위 setState 들이 아직 반영되기 전이라, 화면 상태로 찍으면 서버가 새로
            부여한 id 가 빠진 값이 기준점이 된다.
          */
          setSavedPayload(
            JSON.stringify(
              buildResumeSavePayload({
                id: saved.resume.id,
                form: { ...form, title: saved.resume.title },
                sectionCodes: saved.resume.sectionCodes ?? sectionCodes,
                educations: withKeys(saved.educations, "edu"),
                experiences: withKeys(saved.experiences, "exp"),
                qualifications: withKeys(saved.qualifications, "qual"),
                trainings: withKeys(saved.trainings, "train"),
                skills: withKeys(saved.skills, "skill"),
                items: withKeys(saved.items, "item"),
              }),
            ),
          );
          setSaveMessage(`저장 완료 · 완성도 ${saved.resume.completeness}%`);
          resolve(saved);
        } catch (err) {
          setSaveMessage(err instanceof Error ? err.message : "저장에 실패했습니다.");
          reject(err);
        }
      });
    });
  }

  /**
   * 창에서 고른 기준으로 점검한다. 기준이 바뀌었으면 먼저 바꾼 뒤 그 기준으로 본다.
   * 기준을 바꾸는 동안에도 버튼이 도는 상태여야 해서 점검까지 한 전환으로 묶는다.
   */
  function handleReviewWithAgent() {
    setReviewPickerOpen(false);
    startTemplateChange(async () => {
      if (pickedAgentId && pickedAgentId !== resume.templateId) {
        const next = await changeResumeTemplateAction(resume.id, pickedAgentId);
        if (next) setDetail(next);
      }
      await handleReview();
    });
  }

  async function handleReview() {
    startReview(async () => {
      try {
        await handleSave();
        const result = await reviewResumeAiAction(resume.id);
        setReviewResult(result);
        setMarketComparison(null);
        // AI 첨삭과 독립 - 실패해도 첨삭 결과 표시에는 영향 없음 (설계 3절)
        const requestId = ++marketComparisonRequestRef.current;
        void getResumeMarketComparisonAction(resume.id)
          .then((data) => {
            if (marketComparisonRequestRef.current !== requestId) return;
            setMarketComparison(data);
          })
          .catch(() => {
            if (marketComparisonRequestRef.current !== requestId) return;
            setMarketComparison(null);
          });
      } catch {
        setSaveMessage("AI 점검 중 오류가 발생했습니다.");
      }
    });
  }

  async function handleGenerateSummary() {
    startGenerateSummary(async () => {
      try {
        await handleSave();
        const result = await generateCareerSummaryAiAction(resume.id);
        setSummarySuggestion(result.summary);
      } catch {
        setSaveMessage("AI 요약 생성 중 오류가 발생했습니다.");
      }
    });
  }

  function openRewrite(key: string, field: "responsibilities" | "achievements", text: string) {
    // 다른 칸의 버튼을 disabled로 흐리게 만들면 같이 로딩되는 것처럼 보인다.
    // 겉모습은 그대로 두고 요청 중복만 조용히 막는다.
    if (isRewriting) return;
    setRewritePending({ key, field });
    startRewrite(async () => {
      try {
        await handleSave();
        const exp = experiences.find((e) => e._key === key);
        const result = await rewriteResumeSectionAiAction({
          resumeId: resume.id,
          sectionLabel: `${exp?.companyName ?? ""} ${field === "responsibilities" ? "담당업무" : "성과"}`,
          originalText: text,
        });
        setRewriteTarget({ key, field, text: result.rewrittenText });
      } catch {
        setSaveMessage("AI 다듬기 중 오류가 발생했습니다.");
      } finally {
        setRewritePending(null);
      }
    });
  }

  function handlePrint() {
    void trackResumeExportedAction(resume.id, "pdf");
    window.print();
  }

  /** 팝업 오버레이가 인쇄물에 끼지 않도록 닫힘 애니메이션이 끝난 뒤 인쇄한다. */
  function handlePopupPrint() {
    setPreviewOpen(false);
    setTimeout(() => handlePrint(), 200);
  }

  /*
    항목별 카드. 사이드바에서 정한 순서대로 그려야 하므로 코드로 꺼내 쓸 수 있게 모아둔다.
    JSX 를 쓰인 자리에 그대로 두면 파일에 적힌 순서로만 나와, 순서를 바꿔도 화면이 그대로다.
  */
  const sectionCards: Record<string, React.ReactNode> = {
    BASIC_INFO: (
            <Card className="rounded-xl border-0 ring-0">
              <CardHeader>
                <CardTitle className="text-body-1 font-semibold">기본정보</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Field label="이름" required>
                  <CompactInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </Field>
                <Field label="이메일" required>
                  <CompactInput value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </Field>
                <Field label="전화번호" required>
                  <CompactInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </Field>
                <Field label="주소/거주지역">
                  <CompactInput value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </Field>
                <Field label="희망직무">
                  <CompactInput value={form.desiredJobTitle} onChange={(e) => setForm((f) => ({ ...f, desiredJobTitle: e.target.value }))} />
                </Field>
                {/*
                  희망근무지역은 "gwangju" 같은 지역 코드로 저장된다. 자유 입력으로 두면
                  코드가 그대로 보이고, 사람이 "광주"라고 고쳐 쓰면 저장된 값이 코드가
                  아니게 돼 지역으로 걸리는 추천에서 빠진다. 목록에서 고르게 한다.
                */}
                <Field label="희망근무지역">
                  <NativeSelect
                    className="h-10 text-label-1"
                    value={form.desiredRegion ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, desiredRegion: e.target.value }))}
                  >
                    <option value="">선택</option>
                    {Object.entries(REGION_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </CardContent>
            </Card>
    ),
    SUMMARY: (
            <Card className="rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                {/*
                  * 를 붙이지 않는다. 이 별표는 이름·이메일처럼 "이 칸을 비우면 안 된다"는
                  뜻으로 쓰는데, 한 줄 소개는 항목 자체를 뺄 수 있다. 담은 동안 채워야 하는 건
                  경력·학력과 똑같고, 그쪽에도 별표는 없다.
                */}
                <CardTitle className="text-body-1 font-semibold">한 줄 소개</CardTitle>
                {/*
                  이 버튼은 이 칸에 쓴 글을 고치는 것이 아니라, 경력·자격·스킬을 재료로
                  문장을 만들어 제안한다. "다듬기"라고 부르면 쓴 글을 손봐주는 줄 알고
                  빈 칸에서 누르게 되고, 재료가 없으면 아무것도 못 만든다.
                  이름으로 무엇을 재료 삼는지 밝히고, 재료가 없으면 누를 수 없게 한다.
                */}
                <AiButton
                  onClick={handleGenerateSummary}
                  loading={isGeneratingSummary}
                  disabled={!hasSummaryMaterial}
                >
                  내 경력으로 문장 만들기
                </AiButton>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="예) 사무·고객응대 경력 8년, 사회복지 분야로 직무전환을 준비하는 지원자"
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  rows={3}
                />
                {/* 버튼이 왜 잠겨 있는지 버튼 옆에서 바로 알 수 있어야 한다. */}
                {!hasSummaryMaterial && (
                  <p className="mt-2 text-label-1 text-slate-500">
                    아래 경력·자격·스킬을 하나라도 채우시면, 그 내용으로 이 문장을 만들어드려요.
                  </p>
                )}
                {summarySuggestion && (
                  <div className="mt-2 rounded-lg bg-brand-blue-50 p-3 text-label-1">
                    <p className="text-slate-700">{summarySuggestion}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => { setForm((f) => ({ ...f, summary: summarySuggestion })); setSummarySuggestion(null); }}>
                        적용
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSummarySuggestion(null)}>
                        닫기
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
    ),
    EXPERIENCE: (
            <Card className="rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1 font-semibold">경력</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-700"
                  disabled={Boolean(form.hasNoWorkExperience)}
                  onClick={() => {
                    const key = nextKey("exp");
                    setExperiences((prev) => [...prev, { _key: key, companyName: "", isCurrent: false, orderIndex: prev.length }]);
                    setEntryEditing(key, true);
                  }}
                >
                  <Plus className="size-4" /> 경력 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/*
                  경력이 없는 회원은 왼쪽 목록에서 경력 항목을 통째로 빼면 된다.
                  "아직 경력이 없어요" 체크를 여기 따로 두면 같은 말을 두 군데서 하게 된다.
                */}
                {experiences.length === 0 && (
                  <p className="text-label-1 text-slate-400">
                    아직 등록된 경력이 없습니다. [경력 추가]를 눌러 시작해보세요.
                  </p>
                )}
                {experiences.map((exp, idx) => (
                  isEntryEditing(exp._key) ? (
                  <div key={exp._key} className="space-y-2 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-label-2 font-semibold text-slate-400">경력 {idx + 1}</p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => setEntryEditing(exp._key, false)}>
                          완료
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setExperiences((prev) => prev.filter((e) => e._key !== exp._key))}>
                          <Trash2 className="size-4 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="회사명">
                        <CompactInput
                          value={exp.companyName}
                          onChange={(e) => updateAt(setExperiences, exp._key, { companyName: e.target.value })}
                        />
                      </Field>
                      <Field label="직책/직급">
                        <CompactInput value={exp.position ?? ""} onChange={(e) => updateAt(setExperiences, exp._key, { position: e.target.value })} />
                      </Field>
                      <Field label="입사년월">
                        <MonthPicker value={toMonth(exp.startDate)} onChange={(v) => updateAt(setExperiences, exp._key, { startDate: v })} />
                      </Field>
                      <Field label="퇴사년월">
                        <MonthPicker
                          value={toMonth(exp.endDate)}
                          disabled={exp.isCurrent}
                          onChange={(v) => updateAt(setExperiences, exp._key, { endDate: v })}
                        />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-label-1 text-slate-600">
                      <Checkbox checked={exp.isCurrent} onCheckedChange={(v) => updateAt(setExperiences, exp._key, { isCurrent: Boolean(v) })} />
                      현재 재직중
                    </label>
                    <Field label="어떤 일을 하셨나요? (예: 고객상담, 거래처 관리, 문서작성)" required>
                      <Textarea
                        className="bg-white"
                        value={exp.responsibilities ?? ""}
                        onChange={(e) => updateAt(setExperiences, exp._key, { responsibilities: e.target.value })}
                        rows={2}
                      />
                      <AiButton
                        size="xs"
                        className="mt-1 ml-auto flex w-fit"
                        onClick={() => openRewrite(exp._key, "responsibilities", exp.responsibilities ?? "")}
                        loading={rewritePending?.key === exp._key && rewritePending.field === "responsibilities"}
                        disabled={!exp.responsibilities?.trim()}
                      >
                        AI 다듬기
                      </AiButton>
                    </Field>
                    <Field label="기억나는 성과가 있나요? (숫자가 없어도 괜찮습니다)">
                      <Textarea
                        className="bg-white"
                        value={exp.achievements ?? ""}
                        onChange={(e) => updateAt(setExperiences, exp._key, { achievements: e.target.value })}
                        rows={2}
                      />
                      <AiButton
                        size="xs"
                        className="mt-1 ml-auto flex w-fit"
                        onClick={() => openRewrite(exp._key, "achievements", exp.achievements ?? "")}
                        loading={rewritePending?.key === exp._key && rewritePending.field === "achievements"}
                        disabled={!exp.achievements?.trim()}
                      >
                        AI 다듬기
                      </AiButton>
                    </Field>
                    {rewriteTarget?.key === exp._key && (
                      <div className="rounded-lg bg-white p-3 text-label-1 ring-1 ring-brand-blue-200">
                        <p className="text-slate-700">{rewriteTarget.text}</p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              updateAt(setExperiences, exp._key, { [rewriteTarget.field]: rewriteTarget.text });
                              setRewriteTarget(null);
                            }}
                          >
                            적용
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRewriteTarget(null)}>
                            닫기
                          </Button>
                        </div>
                      </div>
                    )}
                    <Field label="퇴사 이유 (선택)">
                      <CompactInput value={exp.reasonForLeaving ?? ""} onChange={(e) => updateAt(setExperiences, exp._key, { reasonForLeaving: e.target.value })} />
                    </Field>
                  </div>
                  ) : (
                  // 작성이 끝난 경력은 요약 카드로 보여준다. 연필을 눌러야 폼이 다시 열린다.
                  <EntrySummaryCard
                    key={exp._key}
                    title={`${exp.companyName || "회사명 미입력"}${exp.position ? ` · ${exp.position}` : ""}`}
                    meta={periodLabel(exp.startDate, exp.endDate, exp.isCurrent) || undefined}
                    body={exp.responsibilities || undefined}
                    editLabel={`경력 ${idx + 1} 수정`}
                    onEdit={() => setEntryEditing(exp._key, true)}
                  />
                  )
                ))}
              </CardContent>
            </Card>
    ),
    EDUCATION: (
            <Card className="rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1 font-semibold">학력</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-700"
                  onClick={() => {
                    const key = nextKey("edu");
                    setEducations((prev) => [...prev, { _key: key, schoolName: "", orderIndex: prev.length }]);
                    setEntryEditing(key, true);
                  }}
                >
                  <Plus className="size-4" /> 학력 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {educations.length === 0 && <p className="text-label-1 text-slate-400">최종학력 위주로 간단히 입력하셔도 됩니다.</p>}
                {educations.map((edu, idx) => {
                  // 고등학교/검정고시는 입학년월·전공 입력 없이 졸업 정보만 받는다.
                  const isGed = edu.educationType === GED_TYPE;
                  const isSimpleEducation = SIMPLE_EDUCATION_TYPES.has(edu.educationType ?? "");
                  // 대학 이상을 고른 경우에만 편입 체크를 보여준다. 전용 컬럼이 없어 description에 "편입"으로 저장한다.
                  const isCollege = Boolean(edu.educationType) && !isSimpleEducation;
                  const isTransfer = edu.description === "편입";
                  if (!isEntryEditing(edu._key)) {
                    // 작성이 끝난 학력은 요약 카드로 보여준다. 연필을 눌러야 폼이 다시 열린다.
                    const meta = [
                      periodLabel(edu.admissionDate, edu.graduationDate),
                      isGed ? "합격" : edu.graduationStatus,
                      isTransfer ? "편입" : undefined,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <EntrySummaryCard
                        key={edu._key}
                        title={isGed ? GED_SCHOOL_NAME : edu.schoolName || "학교명 미입력"}
                        subtitle={!isSimpleEducation ? edu.major || undefined : undefined}
                        meta={meta || undefined}
                        editLabel={`학력 ${idx + 1} 수정`}
                        onEdit={() => setEntryEditing(edu._key, true)}
                      />
                    );
                  }
                  return (
                    <div key={edu._key} className="space-y-2 rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-label-2 font-semibold text-slate-400">학력 {idx + 1}</p>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => setEntryEditing(edu._key, false)}>
                            완료
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEducations((prev) => prev.filter((e) => e._key !== edu._key))}>
                            <Trash2 className="size-4 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-6">
                        <Field label="학교구분" className="sm:col-span-2">
                          <NativeSelect
                            className="h-10 text-label-1"
                            value={isGed ? "고등학교" : (edu.educationType ?? "")}
                            onChange={(e) => updateAt(setEducations, edu._key, { educationType: e.target.value })}
                          >
                            <option value="">선택</option>
                            {EDUCATION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </NativeSelect>
                        </Field>
                        <Field label="학교명" className="sm:col-span-4">
                          <CompactInput
                            value={isGed ? GED_SCHOOL_NAME : edu.schoolName}
                            disabled={isGed}
                            onChange={(e) => updateAt(setEducations, edu._key, { schoolName: e.target.value })}
                          />
                        </Field>
                        {!isSimpleEducation && (
                          <Field label="입학년월" className="sm:col-span-2">
                            <MonthPicker value={toMonth(edu.admissionDate)} onChange={(v) => updateAt(setEducations, edu._key, { admissionDate: v })} />
                          </Field>
                        )}
                        <Field label={isGed ? "합격년월" : "졸업년월"} className="sm:col-span-2">
                          <MonthPicker value={toMonth(edu.graduationDate)} onChange={(v) => updateAt(setEducations, edu._key, { graduationDate: v })} />
                        </Field>
                        {!isGed && (
                          <Field label="졸업상태" className="sm:col-span-2">
                            <NativeSelect
                              className="h-10 text-label-1"
                              value={edu.graduationStatus ?? ""}
                              onChange={(e) => updateAt(setEducations, edu._key, { graduationStatus: e.target.value })}
                            >
                              <option value="">선택</option>
                              {GRADUATION_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </NativeSelect>
                          </Field>
                        )}
                        {isSimpleEducation && (
                          <label className="flex items-center gap-2 self-end pb-2 text-label-1 text-slate-600 sm:col-span-2">
                            <Checkbox
                              checked={isGed}
                              onCheckedChange={(v) =>
                                updateAt(
                                  setEducations,
                                  edu._key,
                                  Boolean(v)
                                    ? { educationType: GED_TYPE, schoolName: GED_SCHOOL_NAME, graduationStatus: "합격" }
                                    : { educationType: "고등학교", schoolName: "", graduationStatus: undefined },
                                )
                              }
                            />
                            대입검정고시
                          </label>
                        )}
                        {!isSimpleEducation && (
                          <Field label="전공명" className="sm:col-span-4">
                            <CompactInput value={edu.major ?? ""} onChange={(e) => updateAt(setEducations, edu._key, { major: e.target.value })} />
                          </Field>
                        )}
                        {isCollege && (
                          <label className="flex items-center gap-2 self-end pb-2 text-label-1 text-slate-600 sm:col-span-2">
                            <Checkbox
                              checked={isTransfer}
                              onCheckedChange={(v) => updateAt(setEducations, edu._key, { description: v ? "편입" : undefined })}
                            />
                            편입
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
    ),
    QUALIFICATION: (
            <Card className="rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1 font-semibold">보유 자격</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-700"
                  onClick={() => {
                    const key = nextKey("qual");
                    setQualifications((prev) => [...prev, { _key: key, name: "", orderIndex: prev.length }]);
                    setEntryEditing(key, true);
                  }}
                >
                  <Plus className="size-4" /> 자격 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {qualifications.length === 0 && <p className="text-label-1 text-slate-400">사회복지사 2급, 요양보호사, 운전면허 등을 추가해보세요.</p>}
                {qualifications.map((q, idx) => (
                  isEntryEditing(q._key) ? (
                  /* 교육/훈련과 같은 구조. 연월이 두 칸이라 한 줄에 다 넣으면 좁다. */
                  <div key={q._key} className="space-y-2 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-label-2 font-semibold text-slate-400">자격 {idx + 1}</p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => setEntryEditing(q._key, false)}>
                          완료
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setQualifications((prev) => prev.filter((x) => x._key !== q._key))}>
                          <Trash2 className="size-4 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
                      <Field label="자격명">
                        <CompactInput value={q.name} onChange={(e) => updateAt(setQualifications, q._key, { name: e.target.value })} />
                      </Field>
                      <Field label="발급기관">
                        <CompactInput value={q.issuer ?? ""} onChange={(e) => updateAt(setQualifications, q._key, { issuer: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="취득년월" className="sm:max-w-xs">
                      {/* 다른 항목과 같이 연월만 받는다. 자격증에 일자까지 필요한 곳은 없다. */}
                      <MonthPicker
                        value={toMonth(q.acquiredAt)}
                        onChange={(v) => updateAt(setQualifications, q._key, { acquiredAt: toDbDate(v) })}
                      />
                    </Field>
                  </div>
                  ) : (
                  <EntrySummaryCard
                    key={q._key}
                    title={q.name || "자격명 미입력"}
                    subtitle={q.issuer || undefined}
                    meta={q.acquiredAt ? toMonth(q.acquiredAt).replace("-", ".") : undefined}
                    editLabel={`자격 ${idx + 1} 수정`}
                    onEdit={() => setEntryEditing(q._key, true)}
                  />
                  )
                ))}
              </CardContent>
            </Card>
    ),
    SKILLS: (
            <Card className="rounded-xl border-0 ring-0">
              <CardHeader>
                <CardTitle className="text-body-1 font-semibold">보유 스킬</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <CompactInput
                    placeholder="예: 엑셀, 상담, 운전"
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && skillDraft.trim()) {
                        e.preventDefault();
                        setSkills((prev) => [...prev, { _key: nextKey("skill"), name: skillDraft.trim(), orderIndex: prev.length }]);
                        setSkillDraft("");
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-700"
                    onClick={() => {
                      if (!skillDraft.trim()) return;
                      setSkills((prev) => [...prev, { _key: nextKey("skill"), name: skillDraft.trim(), orderIndex: prev.length }]);
                      setSkillDraft("");
                    }}
                  >
                    추가
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Badge
                      key={s._key}
                      /* 직접 넣은 값이라 회색보다 눈에 들어와야 하고, 옆 × 를 누르려면 손가락이 닿을 만큼은 커야 한다. */
                      className="gap-1.5 rounded-full border-transparent bg-brand-blue-50 px-3 py-2 text-label-1 font-semibold text-brand-blue-700"
                    >
                      {s.name}
                      <button
                        onClick={() => setSkills((prev) => prev.filter((x) => x._key !== s._key))}
                        aria-label={`${s.name} 삭제`}
                        className="-mr-0.5 flex size-4 items-center justify-center rounded-full text-brand-blue-600 transition-colors hover:bg-brand-blue-100 hover:text-brand-blue-800"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
    ),
    TRAINING: (
            <Card className="rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1 font-semibold">교육/훈련</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-700"
                  onClick={() => {
                    const key = nextKey("train");
                    setTrainings((prev) => [...prev, { _key: key, courseName: "", orderIndex: prev.length }]);
                    setEntryEditing(key, true);
                  }}
                >
                  <Plus className="size-4" /> 교육 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {trainings.map((t, idx) => (
                  isEntryEditing(t._key) ? (
                  /*
                    연월이 연도·월 두 칸으로 늘어 한 줄에 다 넣으면 칸마다 너무 좁다.
                    경력 편집처럼 머리줄(제목 + 완료·삭제) 아래로 두 줄에 나눠 담는다.
                  */
                  <div key={t._key} className="space-y-2 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-label-2 font-semibold text-slate-400">교육 {idx + 1}</p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => setEntryEditing(t._key, false)}>
                          완료
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setTrainings((prev) => prev.filter((x) => x._key !== t._key))}>
                          <Trash2 className="size-4 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
                      <Field label="과정명">
                        <CompactInput value={t.courseName} onChange={(e) => updateAt(setTrainings, t._key, { courseName: e.target.value })} />
                      </Field>
                      <Field label="교육기관">
                        <CompactInput value={t.institution ?? ""} onChange={(e) => updateAt(setTrainings, t._key, { institution: e.target.value })} />
                      </Field>
                    </div>
                    {/* 다른 항목과 같이 연월만 받는다. 수료 시기가 없으면 최근 교육인지 알 수 없다. */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="시작">
                        <MonthPicker
                          value={toMonth(t.startDate)}
                          onChange={(v) => updateAt(setTrainings, t._key, { startDate: toDbDate(v) })}
                        />
                      </Field>
                      <Field label="수료">
                        <MonthPicker
                          value={toMonth(t.endDate)}
                          onChange={(v) => updateAt(setTrainings, t._key, { endDate: toDbDate(v) })}
                        />
                      </Field>
                    </div>
                  </div>
                  ) : (
                  <EntrySummaryCard
                    key={t._key}
                    title={t.courseName || "과정명 미입력"}
                    subtitle={t.institution || undefined}
                    meta={periodLabel(t.startDate, t.endDate) || undefined}
                    editLabel={`교육 ${idx + 1} 수정`}
                    onEdit={() => setEntryEditing(t._key, true)}
                  />
                  )
                ))}
              </CardContent>
            </Card>
    ),
    EXTRA: (
            <Card className="rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1 font-semibold">봉사·수상 등 추가 경력</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-700"
                  onClick={() => {
                    const key = nextKey("item");
                    setItems((prev) => [...prev, { _key: key, sectionType: "AWARD", title: "", orderIndex: prev.length }]);
                    setEntryEditing(key, true);
                  }}
                >
                  <Plus className="size-4" /> 항목 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 && <p className="text-label-1 text-slate-400">모든 사용자에게 필수는 아닙니다. 있으면 추가해주세요.</p>}
                {items.map((item, idx) => (
                  isEntryEditing(item._key) ? (
                  <div
                    key={item._key}
                    /* 칸마다 필요한 폭이 달라 4등분하지 않는다. 설명이 가장 길고 버튼은 제 크기면 된다. */
                    className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[9rem_1fr_1.6fr_auto]"
                  >
                    <NativeSelect
                      className="h-10 text-label-1"
                      value={item.sectionType}
                      onChange={(e) => updateAt(setItems, item._key, { sectionType: e.target.value as ResumeItemSectionType })}
                    >
                      {/* 저장된 값이 목록에 없으면 빈칸이 되어 무엇을 골라야 할지 알 수 없다. */}
                      <option value="">종류 선택</option>
                      {Object.entries(ITEM_SECTION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect>
                    <CompactInput placeholder="제목" value={item.title} onChange={(e) => updateAt(setItems, item._key, { title: e.target.value })} />
                    <CompactInput placeholder="설명 (선택)" value={item.description ?? ""} onChange={(e) => updateAt(setItems, item._key, { description: e.target.value })} />
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setEntryEditing(item._key, false)}>
                        완료
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setItems((prev) => prev.filter((x) => x._key !== item._key))}>
                        <Trash2 className="size-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                  ) : (
                  <EntrySummaryCard
                    key={item._key}
                    title={item.title || "제목 미입력"}
                    subtitle={item.description || undefined}
                    meta={ITEM_SECTION_LABELS[item.sectionType]}
                    editLabel={`기타 항목 ${idx + 1} 수정`}
                    onEdit={() => setEntryEditing(item._key, true)}
                  />
                  )
                ))}
              </CardContent>
            </Card>
    ),
  };

  return (
    <div className="space-y-6">

      {/*
        좁은 화면용 항목 띠. 항목이 세로로 길게 이어져 본문 한가운데서는 지금 무엇을
        채우는지도, 다른 항목으로 건너갈 길도 없었다. 헤더(64px) 밑에 붙여 두고
        스크롤 위치에 따라 지금 항목을 짚어 준다. 넓은 화면은 왼쪽 목록이 그 일을 한다.
      */}
      <div
        ref={stripRef}
        className="scrollbar-hidden sticky top-16 z-30 -mx-4.5 -mt-10 mb-2 flex gap-1 overflow-x-auto border-b border-border bg-white/95 px-4.5 py-2 backdrop-blur print:hidden lg:hidden"
      >
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            data-strip-key={item.key}
            onClick={() => scrollToSection(item.key)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-label-1 whitespace-nowrap transition-colors",
              activeSectionKey === item.key
                ? "bg-brand-blue-50 font-semibold text-brand-blue-600"
                : "font-medium text-slate-500",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-white p-4">
          <div className="min-w-48 flex-1">
            <Label htmlFor="resume-title" className="text-label-2 text-slate-400">
              이력서 제목
            </Label>
            <CompactInput
              id="resume-title"
              placeholder="이력서 제목을 입력해주세요"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1"
            />
          </div>
        </div>

        {reviewResult && (
          <Card className="rounded-xl border-0 ring-1 ring-brand-blue-200 bg-brand-blue-50/40">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-body-2">
                AI 점검 결과 <Badge className="bg-brand-blue-400">{reviewResult.score}점</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-label-1">
              {reviewResult.strengths.length > 0 && (
                <div>
                  <p className="font-semibold text-emerald-700">잘 작성된 부분</p>
                  <ul className="ml-4 list-disc text-slate-600">
                    {reviewResult.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {reviewResult.improvements.length > 0 && (
                <div>
                  <p className="font-semibold text-orange-700">보완할 부분</p>
                  <ul className="ml-4 list-disc text-slate-600">
                    {reviewResult.improvements.map((s, i) => (
                      <li key={i}>{s.comment}</li>
                    ))}
                  </ul>
                </div>
              )}
              {reviewResult.missingInformation.length > 0 && (
                <div>
                  <p className="font-semibold text-orange-700">누락된 정보</p>
                  <ul className="ml-4 list-disc text-slate-600">
                    {reviewResult.missingInformation.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {reviewResult && marketComparison && (
          <MarketComparisonCard
            key={marketComparison.analysisId ?? "no-analysis"}
            view={marketComparison}
            source="resume_review"
          />
        )}

        {/*
          왼쪽은 항목 목록, 오른쪽은 지금 채우는 항목 하나.
          좁은 화면에서는 목록이 위로 올라가 가로로 눕는다.
        */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/*
            사이드바 한 곳에서 이력서의 상태(완성도)와 구성(항목)을 함께 본다.
            완성도만 아래 고정바에 두면 "얼마나 남았는지"와 "무엇을 더 담을 수 있는지"가
            화면 양 끝으로 갈라져, 완성도를 올리려고 항목을 손보는 흐름이 끊긴다.
          */}
          <nav className="rounded-xl bg-white p-4 lg:sticky lg:top-24 lg:w-72 lg:shrink-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-label-1 font-bold text-slate-900">이력서 완성도</p>
              <p className="text-body-1 font-bold text-brand-blue-600">{liveCompleteness.score}%</p>
            </div>
            <Progress value={liveCompleteness.score} className="mt-2 h-2" />
            <p className="mt-2 text-label-2 text-slate-500">
              {liveCompleteness.missing.length > 0
                ? `다음은 ${liveCompleteness.missing[0].label} 차례예요.`
                : `${form.name ? `${form.name} 회원님의 ` : ""}이력서가 다 채워졌어요!`}
            </p>

            {/*
              점검은 "무엇을 기준으로 볼지"를 먼저 정해야 하는 일이다. 기준(에이전트) 네 개를
              늘 펼쳐두면 쓰지도 않을 선택지가 화면 위 한 줄을 계속 차지한다. 버튼 하나로 두고,
              누르면 기준을 고르는 창을 띄운다.
            */}
            {/* 이 화면에서 가장 먼저 권하는 동작이라, 다른 AI 버튼과 달리 채운 파랑으로 둔다. */}
            <AiButton
              className="mt-4 w-full bg-brand-blue-600 font-semibold text-white hover:bg-brand-blue-700 active:bg-brand-blue-700"
              onClick={() => setReviewPickerOpen(true)}
              loading={isReviewing || isChangingTemplate}
            >
              AI 이력서 점검 받기
            </AiButton>

            <div className="mt-4 border-t border-border pt-3">
              <p className="px-1 text-label-2 font-semibold text-slate-400">이력서 항목 {navItems.length}/{sectionRows.length}</p>

              <ul className="mt-1 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                {sectionRows.map((row) => (
                  <li key={row.key} className="shrink-0 lg:shrink">
                    <div className="flex items-center rounded-lg transition-colors hover:bg-slate-50">
                      <button
                        type="button"
                        disabled={!row.included}
                        onClick={() => scrollToSection(row.key)}
                        className={cn(
                          // 좁은 화면에서는 가로로 눕는 줄이라, 이름이 길면 한 칸이 화면을 다 먹는다.
                          "flex max-w-40 min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-label-1 lg:max-w-none",
                          row.included ? "cursor-pointer text-slate-700" : "text-slate-400",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full text-label-2 font-bold",
                            !row.included
                              ? "text-slate-300"
                              : row.filled
                                ? "bg-brand-blue-100 text-brand-blue-600"
                                : "bg-slate-100 text-slate-400",
                          )}
                        >
                          {/* 안 담은 항목은 자리만 비워 이름 끝이 위아래로 맞게 둔다. */}
                          {!row.included ? "" : row.filled ? <Check className="size-3.5" /> : row.order}
                        </span>
                        <span className="truncate">{row.label}</span>
                      </button>

                      {/*
                        기본정보는 이력서가 이력서이기 위한 최소한이라 뺄 수 없고, 자리도 맨 위에
                        고정한다. 이름과 연락처가 문서 중간에 오면 이력서로 안 읽힌다.

                        넣고 빼는 버튼은 테두리를 둘러 눌리는 것으로 보이게 한다. 회색 기호만
                        떠 있으면 호버하기 전에는 그림인지 버튼인지 알 수 없다.
                      */}
                      {row.fixed ? (
                        /* 회색은 "빼기 버튼이 비활성"처럼 읽힌다. 뺄 수 없다는 뜻이 전해지게
                           파랑을 쓰되, 메인 파랑(400)은 이 작은 글자에 너무 세서 한 단계 연하게 둔다. */
                        <span className="shrink-0 pr-3 text-label-2 text-brand-blue-300">필수</span>
                      ) : !row.included ? (
                        <Button
                          variant="outline"
                          size="icon-xs"
                          className="mr-1.5 shrink-0 text-slate-500"
                          aria-label={`${row.label} 담기`}
                          onClick={() => addSectionRow(row)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      ) : reordering ? (
                        <span className="flex shrink-0 items-center gap-1 pr-1.5">
                          <Button
                            variant="outline"
                            size="icon-xs"
                            className="text-slate-500"
                            aria-label={`${row.label} 위로`}
                            disabled={row.navIndex === firstMovableIndex}
                            onClick={() => moveSectionItem(row, -1)}
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            className="text-slate-500"
                            aria-label={`${row.label} 아래로`}
                            disabled={row.navIndex === navItems.length - 1}
                            onClick={() => moveSectionItem(row, 1)}
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon-xs"
                          className="mr-1.5 shrink-0 text-slate-500"
                          aria-label={`${row.label} 빼기`}
                          onClick={() => removeSectionItem(row)}
                        >
                          <Minus className="size-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/*
                순서 변경은 목록을 다 보고 나서 하는 동작이라 목록 아래에 둔다.
                제목 옆에 있을 때는 작은 글자 옆의 더 작은 버튼이라 잘 보이지 않았다.
              */}
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-slate-600"
                onClick={() => setReordering((v) => !v)}
              >
                {reordering ? "순서 변경 끝내기" : "항목 순서 변경"}
              </Button>
            </div>
          </nav>

          <div className="min-w-0 flex-1 space-y-4">
            {navItems.map((item) => (
              /* 사이드바에서 누르면 이 자리로 내려온다. 헤더에 제목이 가리지 않게 여백을 둔다. */
              <div key={item.key} id={sectionAnchorId(item.key)} className="scroll-mt-32 lg:scroll-mt-24">
                {sectionCards[item.key]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 화면에서는 미리보기를 팝업으로 띄우고, 인쇄(PDF 저장)할 때만 문서 흐름에 노출한다. */}
      <div className="hidden print:block">
        <ResumePreview detail={currentPreviewDetail()} />
      </div>

      {/*
        저장은 폼을 다 채운 뒤에 하는 동작이라 아래에 둔다. 폼이 길어 화면 밖으로 나가므로
        화면 하단에 전체 폭으로 고정한다(컨테이너 밖까지 꽉 차야 하므로 sticky 대신 fixed).
        버튼 정렬은 안쪽 컨테이너로 본문 폭에 맞춘다.
      */}
      {/*
        위계별 그룹핑: 왼쪽은 문서를 벗어나는 동작(목록으로), 오른쪽은 문서에 대한 동작
        (미리보기 → 저장)을 모아 확정 동작인 저장 하나만 채운다. 삭제는 여기 두지 않는다 -
        편집 화면에서 되돌릴 수 없는 동작은 목록으로 나가서 하게 한다.
      */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white/95 backdrop-blur print:hidden">
        {/* 좁은 화면에서는 셋이 한 줄에 안 들어가 왼쪽 버튼이 잘렸다. 남는 자리를 가운데가 먹게 둔다. */}
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4.5 py-3 lg:px-8">
          <Button variant="outline" size="sm" className="shrink-0 text-slate-500" asChild>
            <Link href="/resume">
              <ArrowLeft className="size-4" /> 목록으로
            </Link>
          </Button>

          {/*
            완성도는 저장 버튼 옆에서 진행 막대로 보여준다. 상단 배지로 두면
            한참 스크롤한 뒤에는 보이지 않아 얼마나 남았는지 알 수 없었다.
            남은 항목 이름을 함께 적어 다음에 무엇을 채울지 바로 알게 한다.
          */}
          {/*
            완성도는 왼쪽 항목 목록 맨 위에 있다. 그 목록이 화면에 붙어 있는 넓은 화면에서는
            여기까지 두면 같은 값이 두 군데 보인다. 목록이 위로 밀려 올라가는 좁은 화면에서만 둔다.
          */}
          {/* 바깥 칸은 넓은 화면에서도 자리를 지킨다. 통째로 감추면 오른쪽 버튼들이 왼쪽으로 몰린다. */}
          <div className="mx-4 hidden min-w-0 flex-1 sm:block">
            <div className="lg:hidden">
              <div className="flex items-center justify-between gap-2 text-label-2">
                <span className="truncate text-slate-500">
                  {liveCompleteness.missing.length > 0
                    ? `다음: ${liveCompleteness.missing[0].label}`
                    : "필수 항목을 모두 채웠어요"}
                </span>
                <span className="shrink-0 font-semibold text-slate-600">{liveCompleteness.score}%</span>
              </div>
              <Progress value={liveCompleteness.score} className="mt-1 h-1.5" />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {saveMessage && <span className="shrink-0 text-label-2 text-slate-400">{saveMessage}</span>}
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" /> 미리보기
            </Button>
            {/* 고친 것이 없으면 누를 수 있어도 아무 일도 일어나지 않아 저장 여부가 헷갈린다. */}
            {/* 넓은 화면에서만 넉넉히 잡는다. 좁은 화면에서는 이 폭 때문에 줄이 넘쳤다. */}
            <Button size="sm" className="sm:min-w-40" onClick={() => void handleSave()} disabled={isSaving || !isDirty}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSaving ? "저장" : isDirty ? "저장" : "저장됨"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={reviewPickerOpen}
        onOpenChange={(next) => {
          // 열 때마다 지금 기준으로 되돌린다. 고르다 닫은 값이 다음에 남아있으면 안 된다.
          if (next) setPickedAgentId(resume.templateId);
          setReviewPickerOpen(next);
        }}
      >
        <DialogContent className="print:hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>어떤 기준으로 점검할까요?</DialogTitle>
            <DialogDescription>
              고른 기준에 맞춰 AI가 이력서를 처음부터 끝까지 살펴봅니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {templates.map((template) => {
              const agent = resolveResumeAgent(template);
              const picked = agent.id === pickedAgentId;
              return (
                <button
                  key={agent.id}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => setPickedAgentId(agent.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    picked ? "border-brand-blue-600 bg-brand-blue-50" : "border-border bg-white hover:border-brand-blue-200",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                      picked ? "border-brand-blue-600 bg-brand-blue-600" : "border-slate-300",
                    )}
                  >
                    {picked && <Check className="size-3 text-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body-2 font-semibold text-slate-900">
                      {agent.emoji && <span aria-hidden className="mr-1.5">{agent.emoji}</span>}
                      {agent.name}
                    </span>
                    {agent.description && (
                      <span className="mt-0.5 block text-label-1 text-slate-500">{agent.description}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewPickerOpen(false)}>
              취소
            </Button>
            <Button disabled={!pickedAgentId} onClick={handleReviewWithAgent}>
              이 기준으로 점검
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="print:hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>미리보기</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto rounded-xl bg-slate-100 p-4 ring-1 ring-border">
            <ResumePreview detail={currentPreviewDetail()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePopupPrint}>
              <Printer className="size-4" /> PDF로 저장/인쇄
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 완성도에 세는 항목임을 알리는 별표. 섹션 제목과 입력칸 라벨에 함께 쓴다. */
function RequiredMark() {
  return (
    <span className="ml-0.5 text-brand-blue-600" aria-label="필수 입력">
      *
    </span>
  );
}

function Field({
  label,
  children,
  className,
  required,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** 완성도에 세는 항목. 별표로 표시해 무엇부터 채워야 하는지 보이게 한다. */
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-label-2 text-slate-500">
        {label}
        {required && <RequiredMark />}
      </Label>
      {children}
    </div>
  );
}


/**
 * 연·월을 각각 고르는 입력칸.
 *
 * type="month" 는 브라우저마다 달력이 다르게 뜨고, 중장년 이용자에게는 달력에서
 * 연도를 거슬러 올라가는 조작이 특히 번거롭다. 목록에서 고르는 편이 확실하다.
 *
 * 값은 지금까지와 같은 "YYYY-MM" 문자열이라 저장 쪽은 달라지지 않는다.
 * 한쪽만 고르면 나머지는 기본값을 채우고 그 값을 화면에도 그대로 보여준다
 * (보이는 것과 저장되는 것이 어긋나지 않게 한다).
 */
const MONTH_PICKER_START_YEAR = 1960;

function MonthPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [year = "", month = ""] = value ? value.split("-") : [];
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - MONTH_PICKER_START_YEAR + 1 }, (_, i) => String(thisYear - i));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <NativeSelect
          className="h-10 text-label-1"
          value={year}
          disabled={disabled}
          onChange={(e) => e.target.value && onChange(`${e.target.value}-${month || "01"}`)}
        >
          <option value="">연도</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="w-24">
        <NativeSelect
          className="h-10 text-label-1"
          value={month}
          disabled={disabled}
          onChange={(e) => e.target.value && onChange(`${year || String(thisYear)}-${e.target.value}`)}
        >
          <option value="">월</option>
          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
            <option key={m} value={m}>
              {Number(m)}월
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

/** 편집 폼은 짧은 값 입력칸이 많아 기본(h-12)보다 낮은 높이로 밀도를 높인다. 회색 항목 박스 위에서도 입력칸은 흰색을 유지한다. */
function CompactInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input {...props} className={cn("h-10 bg-white", className)} />;
}

/** 작성이 끝난 항목을 보여주는 공용 요약 카드. 연필을 누르면 편집 폼으로 전환된다. */
function EntrySummaryCard({
  title,
  subtitle,
  meta,
  body,
  editLabel,
  onEdit,
}: {
  title: string;
  /** 제목 바로 아래 보조 정보 (전공, 발급기관 등) */
  subtitle?: string;
  /** 기간·상태처럼 흐리게 보여줄 정보 */
  meta?: string;
  /** 담당업무처럼 2줄로 잘라 보여줄 본문 */
  body?: string;
  editLabel: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
      <div className="min-w-0 flex-1">
        {/* 짧은 정보는 세로로 쌓지 않고 한 줄에 나열한다. 기간·상태는 오른쪽 끝으로 보낸다. */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-label-1 font-semibold text-slate-900">{title}</p>
          {subtitle && <p className="text-label-2 text-slate-600">{subtitle}</p>}
          {meta && <p className="ml-auto text-label-2 text-slate-400">{meta}</p>}
        </div>
        {body && <p className="mt-1 line-clamp-2 text-label-2 leading-relaxed text-slate-600">{body}</p>}
      </div>
      <Button
        variant="outline"
        size="icon-xs"
        onClick={onEdit}
        aria-label={editLabel}
        className="rounded-full text-slate-500"
      >
        <Pencil />
      </Button>
    </div>
  );
}

function updateAt<T extends { _key: string }>(
  setState: React.Dispatch<React.SetStateAction<T[]>>,
  key: string,
  patch: Partial<T>,
) {
  setState((prev) => prev.map((item) => (item._key === key ? { ...item, ...patch } : item)));
}