"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Loader2, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeAgentPicker, type ResumeAgentOption } from "./resume-agent-picker";
import { AiButton } from "@/components/common/ai-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
const ITEM_SECTION_LABELS: Record<ResumeItemSectionType, string> = {
  AWARD: "수상",
  VOLUNTEER: "봉사활동",
  LANGUAGE: "외국어",
  ACTIVITY: "대외활동",
  PROJECT: "프로젝트",
};

export function ResumeEditor({
  initialDetail,
  templates = [],
}: {
  initialDetail: ResumeDetail;
  templates?: ResumeAgentOption[];
}) {
  const [detail, setDetail] = useState(initialDetail);
  const resume = detail.resume;
  const sections = useMemo(
    () => new Set(detail.template?.sections?.length ? detail.template.sections : undefined),
    [detail.template],
  );
  const showSection = (code: string) => sections.size === 0 || sections.has(code);

  const [isChangingTemplate, startTemplateChange] = useTransition();

  /**
   * 에이전트(=템플릿)는 노출 섹션과 AI 점검·생성 기준만 결정하고 입력값은 그대로 남는다.
   * 확인 없이 바로 바꿔도 잃는 데이터가 없다.
   */
  function handleTemplateChange(templateId: string) {
    if (templateId === resume.templateId) return;
    startTemplateChange(async () => {
      const next = await changeResumeTemplateAction(resume.id, templateId);
      if (next) setDetail(next);
    });
  }

  const [form, setForm] = useState({
    title: resume.title,
    summary: resume.summary ?? "",
    desiredJobTitle: resume.desiredJobTitle ?? "",
    desiredRegion: resume.desiredRegion ?? "",
    name: resume.name ?? "",
    email: resume.email ?? "",
    phone: resume.phone ?? "",
    address: resume.address ?? "",
    portfolioUrl: resume.portfolioUrl ?? "",
  });
  const [educations, setEducations] = useState<EditableEducation[]>(withKeys(initialDetail.educations, "edu"));
  const [experiences, setExperiences] = useState<EditableExperience[]>(withKeys(initialDetail.experiences, "exp"));
  const [qualifications, setQualifications] = useState<EditableQualification[]>(withKeys(initialDetail.qualifications, "qual"));
  const [trainings, setTrainings] = useState<EditableTraining[]>(withKeys(initialDetail.trainings, "train"));
  const [skills, setSkills] = useState<EditableSkill[]>(withKeys(initialDetail.skills, "skill"));
  const [items, setItems] = useState<EditableItem[]>(withKeys(initialDetail.items, "item"));
  const [skillDraft, setSkillDraft] = useState("");

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
      resume: { ...resume, ...form },
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
  const liveCompleteness = calculateResumeCompleteness(currentPreviewDetail());

  function handleSave(): Promise<ResumeDetail> {
    return new Promise((resolve, reject) => {
      startSave(async () => {
        try {
          const saved = await saveResumeAction({
            resume: { id: resume.id, ...form },
            educations: educations.map((e) => ({
              ...stripKey(e),
              admissionDate: toDbDate(e.admissionDate),
              graduationDate: toDbDate(e.graduationDate),
            })),
            experiences: experiences.map((e) => ({
              ...stripKey(e),
              startDate: toDbDate(e.startDate),
              endDate: toDbDate(e.endDate),
            })),
            qualifications: qualifications.map(stripKey),
            trainings: trainings.map(stripKey),
            skills: skills.map(stripKey),
            items: items.map(stripKey),
          });
          setDetail(saved);
          setEducations(withKeys(saved.educations, "edu"));
          setExperiences(withKeys(saved.experiences, "exp"));
          setQualifications(withKeys(saved.qualifications, "qual"));
          setTrainings(withKeys(saved.trainings, "train"));
          setSkills(withKeys(saved.skills, "skill"));
          setItems(withKeys(saved.items, "item"));
          setSaveMessage(`저장 완료 · 완성도 ${saved.resume.completeness}%`);
          resolve(saved);
        } catch (err) {
          setSaveMessage(err instanceof Error ? err.message : "저장에 실패했습니다.");
          reject(err);
        }
      });
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

  return (
    // 양식 선택은 편집 폼을 밀어내지 않도록 2단 그리드 바깥, 전체 폭에 둔다.
    <div className="space-y-6">
      {/*
        점검은 이력서 전체를 보는 기능이고 그 기준을 정하는 것이 여기서 고른 에이전트라,
        버튼을 카드 밖에 두지 않고 같은 상자 오른쪽에 넣는다.
      */}
      <div className="print:hidden">
        <ResumeAgentPicker
          agents={templates}
          value={resume.templateId ?? undefined}
          onChange={handleTemplateChange}
          pending={isChangingTemplate}
          action={
            <AiButton onClick={handleReview} loading={isReviewing}>
              이력서 전체 점검
            </AiButton>
          }
        />
      </div>

      <div className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-white p-4">
          <div className="min-w-48 flex-1">
            <Label htmlFor="resume-title" className="text-label-2 text-slate-400">
              이력서 이름
            </Label>
            <CompactInput
              id="resume-title"
              placeholder="제목을 입력해주세요"
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

        <div>
          {showSection("BASIC_INFO") && (
            <Card className="rounded-xl border-0 ring-0">
              <CardHeader>
                <CardTitle className="text-body-1">기본정보</CardTitle>
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
                <Field label="희망근무지역">
                  <CompactInput value={form.desiredRegion} onChange={(e) => setForm((f) => ({ ...f, desiredRegion: e.target.value }))} />
                </Field>
              </CardContent>
            </Card>
          )}

          {showSection("SUMMARY") && (
            <Card className="mt-4 rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1">핵심 경력 / 한 줄 소개<RequiredMark /></CardTitle>
                {/*
                  실제 동작은 아래 경력·자격·스킬을 재료로 문장을 만들어 제안하는 것이다.
                  이 칸에 쓴 글 자체를 고치지는 않는다.
                */}
                <AiButton onClick={handleGenerateSummary} loading={isGeneratingSummary}>
                  AI로 다듬기
                </AiButton>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="예) 사무·고객응대 경력 8년, 사회복지 분야로 직무전환을 준비하는 지원자"
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  rows={3}
                />
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
          )}

          {showSection("EXPERIENCE") && (
            <Card className="mt-4 rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1">경력</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
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
                {experiences.length === 0 && <p className="text-label-1 text-slate-400">아직 등록된 경력이 없습니다. [경력 추가]를 눌러 시작해보세요.</p>}
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
                        <CompactInput type="month" value={toMonth(exp.startDate)} onChange={(e) => updateAt(setExperiences, exp._key, { startDate: e.target.value })} />
                      </Field>
                      <Field label="퇴사년월">
                        <CompactInput
                          type="month"
                          value={toMonth(exp.endDate)}
                          disabled={exp.isCurrent}
                          onChange={(e) => updateAt(setExperiences, exp._key, { endDate: e.target.value })}
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
          )}

          {showSection("EDUCATION") && (
            <Card className="mt-4 rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1">학력</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
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
                          <Select
                            value={isGed ? "고등학교" : (edu.educationType ?? "")}
                            onValueChange={(v) => updateAt(setEducations, edu._key, { educationType: v })}
                          >
                            <CompactSelectTrigger>
                              <SelectValue placeholder="선택" />
                            </CompactSelectTrigger>
                            <SelectContent>
                              {EDUCATION_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <CompactInput type="month" value={toMonth(edu.admissionDate)} onChange={(e) => updateAt(setEducations, edu._key, { admissionDate: e.target.value })} />
                          </Field>
                        )}
                        <Field label={isGed ? "합격년월" : "졸업년월"} className="sm:col-span-2">
                          <CompactInput type="month" value={toMonth(edu.graduationDate)} onChange={(e) => updateAt(setEducations, edu._key, { graduationDate: e.target.value })} />
                        </Field>
                        {!isGed && (
                          <Field label="졸업상태" className="sm:col-span-2">
                            <Select
                              value={edu.graduationStatus ?? ""}
                              onValueChange={(v) => updateAt(setEducations, edu._key, { graduationStatus: v })}
                            >
                              <CompactSelectTrigger>
                                <SelectValue placeholder="선택" />
                              </CompactSelectTrigger>
                              <SelectContent>
                                {GRADUATION_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
          )}

          {showSection("QUALIFICATION") && (
            <Card className="mt-4 rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1">보유 자격</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
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
                  <div key={q._key} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                    <Field label="자격명">
                      <CompactInput value={q.name} onChange={(e) => updateAt(setQualifications, q._key, { name: e.target.value })} />
                    </Field>
                    <Field label="발급기관">
                      <CompactInput value={q.issuer ?? ""} onChange={(e) => updateAt(setQualifications, q._key, { issuer: e.target.value })} />
                    </Field>
                    <Field label="취득일">
                      <CompactInput type="date" value={q.acquiredAt ?? ""} onChange={(e) => updateAt(setQualifications, q._key, { acquiredAt: e.target.value })} />
                    </Field>
                    <div className="flex items-end justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setEntryEditing(q._key, false)}>
                        완료
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setQualifications((prev) => prev.filter((x) => x._key !== q._key))}>
                        <Trash2 className="size-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                  ) : (
                  <EntrySummaryCard
                    key={q._key}
                    title={q.name || "자격명 미입력"}
                    subtitle={q.issuer || undefined}
                    meta={q.acquiredAt ? q.acquiredAt.replaceAll("-", ".") : undefined}
                    editLabel={`자격 ${idx + 1} 수정`}
                    onEdit={() => setEntryEditing(q._key, true)}
                  />
                  )
                ))}
              </CardContent>
            </Card>
          )}

          {showSection("SKILLS") && (
            <Card className="mt-4 rounded-xl border-0 ring-0">
              <CardHeader>
                <CardTitle className="text-body-1">보유 스킬</CardTitle>
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
                      className="gap-1.5 rounded-full border-transparent bg-brand-blue-50 px-3 py-2 text-label-1 font-medium text-brand-blue-700"
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
          )}

          {showSection("TRAINING") && (
            <Card className="mt-4 rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1">교육/훈련</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
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
                  <div key={t._key} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1.4fr_1fr_auto]">
                    <Field label="과정명">
                      <CompactInput value={t.courseName} onChange={(e) => updateAt(setTrainings, t._key, { courseName: e.target.value })} />
                    </Field>
                    <Field label="교육기관">
                      <CompactInput value={t.institution ?? ""} onChange={(e) => updateAt(setTrainings, t._key, { institution: e.target.value })} />
                    </Field>
                    <div className="flex items-end justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setEntryEditing(t._key, false)}>
                        완료
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setTrainings((prev) => prev.filter((x) => x._key !== t._key))}>
                        <Trash2 className="size-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                  ) : (
                  <EntrySummaryCard
                    key={t._key}
                    title={t.courseName || "과정명 미입력"}
                    subtitle={t.institution || undefined}
                    editLabel={`교육 ${idx + 1} 수정`}
                    onEdit={() => setEntryEditing(t._key, true)}
                  />
                  )
                ))}
              </CardContent>
            </Card>
          )}

          {(showSection("PROJECT") || showSection("ACTIVITY")) && (
            <Card className="mt-4 rounded-xl border-0 ring-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-1">봉사·수상 등 추가 경력</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
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
                    <Select value={item.sectionType} onValueChange={(v) => updateAt(setItems, item._key, { sectionType: v as ResumeItemSectionType })}>
                      <CompactSelectTrigger>
                        {/* 저장된 값이 목록에 없으면 빈칸이 되어 무엇을 골라야 할지 알 수 없다. */}
                        <SelectValue placeholder="종류 선택" />
                      </CompactSelectTrigger>
                      <SelectContent>
                        {Object.entries(ITEM_SECTION_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
          )}
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
        위계별 그룹핑: 왼쪽은 문서를 벗어나는 동작(목록으로)이라 ghost로 눌러두고,
        오른쪽은 문서에 대한 동작(미리보기 → 저장)만 모아 확정 동작인 저장 하나만 채운다.
        삭제는 편집 화면이 아니라 이력서 목록에서 처리한다.
      */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-1 px-4 py-3 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="shrink-0 text-slate-500" asChild>
            <Link href="/resume">
              <ArrowLeft className="size-4" /> 목록으로
            </Link>
          </Button>

          {/*
            완성도는 저장 버튼 옆에서 진행 막대로 보여준다. 상단 배지로 두면
            한참 스크롤한 뒤에는 보이지 않아 얼마나 남았는지 알 수 없었다.
            남은 항목 이름을 함께 적어 다음에 무엇을 채울지 바로 알게 한다.
          */}
          <div className="mx-4 hidden min-w-0 flex-1 sm:block">
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

          <div className="flex shrink-0 items-center gap-2">
            {saveMessage && <span className="shrink-0 text-label-2 text-slate-400">{saveMessage}</span>}
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" /> 미리보기
            </Button>
            <Button size="sm" className="min-w-40" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              저장
            </Button>
          </div>
        </div>
      </div>

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

/** 편집 폼은 짧은 값 입력칸이 많아 기본(h-12)보다 낮은 높이로 밀도를 높인다. 회색 항목 박스 위에서도 입력칸은 흰색을 유지한다. */
function CompactInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input {...props} className={cn("h-10 bg-white", className)} />;
}

/**
 * CompactInput(h-10)과 높이를 맞춘 셀렉트 트리거.
 * SelectTrigger의 기본 높이는 data-[size=default]:h-12라 plain 클래스로는 덮어써지지 않는다.
 */
function CompactSelectTrigger({ className, ...props }: React.ComponentProps<typeof SelectTrigger>) {
  return <SelectTrigger {...props} className={cn("w-full bg-white data-[size=default]:h-10", className)} />;
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
          <p className="text-label-1 font-bold text-slate-900">{title}</p>
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