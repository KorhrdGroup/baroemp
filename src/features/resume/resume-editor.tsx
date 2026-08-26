"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PanelRightClose, PanelRightOpen, Plus, Printer, Sparkles, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateCardPicker, type TemplateOption } from "@/components/common/template-card-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  deleteResumeAction,
  generateCareerSummaryAiAction,
  getResumeMarketComparisonAction,
  reviewResumeAiAction,
  rewriteResumeSectionAiAction,
  saveResumeAction,
  trackResumeExportedAction,
} from "./resume-actions";
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

const ITEM_SECTION_LABELS: Record<ResumeItemSectionType, string> = {
  AWARD: "수상",
  PROJECT: "프로젝트",
  ACTIVITY: "대외활동",
  VOLUNTEER: "봉사활동",
  LANGUAGE: "외국어",
};

export function ResumeEditor({
  initialDetail,
  templates = [],
  isNew = false,
}: {
  initialDetail: ResumeDetail;
  templates?: TemplateOption[];
  /** 방금 만든 이력서인지. 그렇다면 양식 선택기를 펼친 채로 연다. */
  isNew?: boolean;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const resume = detail.resume;
  const sections = useMemo(
    () => new Set(detail.template?.sections?.length ? detail.template.sections : undefined),
    [detail.template],
  );
  const showSection = (code: string) => sections.size === 0 || sections.has(code);

  const [isChangingTemplate, startTemplateChange] = useTransition();

  /**
   * 이력서에서 양식은 어떤 섹션을 노출할지만 결정하고 입력값은 그대로 남는다.
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

  const [isSaving, startSave] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("form");
  // 미리보기는 기본으로 펼쳐 둔다. 넓은 화면에서만 접을 수 있다.
  const [showPreview, setShowPreview] = useState(true);

  const [reviewResult, setReviewResult] = useState<AIResumeReviewResult | null>(null);
  const [marketComparison, setMarketComparison] = useState<ResumeMarketComparisonView | null>(null);
  const [isReviewing, startReview] = useTransition();
  const marketComparisonRequestRef = useRef(0);
  const [summarySuggestion, setSummarySuggestion] = useState<string | null>(null);
  const [isGeneratingSummary, startGenerateSummary] = useTransition();
  const [rewriteTarget, setRewriteTarget] = useState<{ key: string; field: "responsibilities" | "achievements"; text: string } | null>(null);
  const [isRewriting, startRewrite] = useTransition();

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

  function handleSave(): Promise<ResumeDetail> {
    return new Promise((resolve, reject) => {
      startSave(async () => {
        try {
          const saved = await saveResumeAction({
            resume: { id: resume.id, ...form },
            educations: educations.map(stripKey),
            experiences: experiences.map(stripKey),
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
      }
    });
  }

  function handlePrint() {
    void trackResumeExportedAction(resume.id, "pdf");
    window.print();
  }

  return (
    // 양식 선택은 편집 폼을 밀어내지 않도록 2단 그리드 바깥, 전체 폭에 둔다.
    <div className="space-y-6">
      <div className="print:hidden">
        <TemplateCardPicker
          label="이력서 양식"
          templates={templates}
          value={resume.templateId ?? undefined}
          onChange={handleTemplateChange}
          pending={isChangingTemplate}
          gridClassName="sm:grid-cols-2 lg:grid-cols-4"
          defaultOpen={isNew}
        />
      </div>

      {/*
        접었을 때도 오른쪽 열을 좁게 남긴다. 토글이 늘 화면 오른쪽 같은 자리에 있어야
        접고 펴는 기능이라는 게 읽힌다. 폼 헤더에 두면 접힘 여부에 따라 버튼이 이동한다.
      */}
      <div className={cn("grid gap-6", showPreview ? "lg:grid-cols-[1fr_1fr]" : "lg:grid-cols-[1fr_2.75rem]")}>
        <div className="space-y-4 print:hidden">
        {/* 편집기는 2단 그리드 안이라 바 폭이 좁다. min-w를 주지 않으면 제목 칸이 0으로 눌린다. */}
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-border">
          <div className="min-w-48 flex-1">
            <Label htmlFor="resume-title" className="text-label-2 text-slate-400">
              이력서 이름
            </Label>
            <Input
              id="resume-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              완성도 {detail.resume.completeness}%
            </Badge>
            <Button variant="outline" size="sm" onClick={handleReview} disabled={isReviewing}>
              {isReviewing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              AI 이력서 점검
            </Button>
          </div>
        </div>

        <Link
          href={
            resume.targetOccupationId
              ? `/career-gap?occupation=${resume.targetOccupationId}${resume.targetJobId ? `&job=${resume.targetJobId}` : ""}`
              : "/career-gap"
          }
          className="flex h-11 items-center justify-center gap-2 rounded-md border border-brand-blue-200 bg-brand-blue-50/60 text-label-1 font-semibold text-brand-blue-700 hover:bg-brand-blue-100"
        >
          <Target className="size-4" />
          지원직무 대비 이력서 점검
        </Link>

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="lg:hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">입력</TabsTrigger>
            <TabsTrigger value="preview">미리보기</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className={activeTab === "preview" ? "hidden lg:block" : "block"}>
          {showSection("BASIC_INFO") && (
            <Card className="rounded-xl border-0 ring-1 ring-border">
              <CardHeader>
                <CardTitle className="text-body-2">기본정보</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Field label="이름">
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </Field>
                <Field label="이메일">
                  <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </Field>
                <Field label="전화번호">
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </Field>
                <Field label="주소/거주지역">
                  <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </Field>
                <Field label="희망직무">
                  <Input value={form.desiredJobTitle} onChange={(e) => setForm((f) => ({ ...f, desiredJobTitle: e.target.value }))} />
                </Field>
                <Field label="희망근무지역">
                  <Input value={form.desiredRegion} onChange={(e) => setForm((f) => ({ ...f, desiredRegion: e.target.value }))} />
                </Field>
              </CardContent>
            </Card>
          )}

          {showSection("SUMMARY") && (
            <Card className="mt-4 rounded-xl border-0 ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-2">핵심 경력 / 한 줄 소개</CardTitle>
                <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
                  {isGeneratingSummary ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  AI로 생성
                </Button>
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
            <Card className="mt-4 rounded-xl border-0 ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-2">경력</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExperiences((prev) => [...prev, { _key: nextKey("exp"), companyName: "", isCurrent: false, orderIndex: prev.length }])}
                >
                  <Plus className="size-4" /> 경력 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {experiences.length === 0 && <p className="text-label-1 text-slate-400">아직 등록된 경력이 없습니다. [경력 추가]를 눌러 시작해보세요.</p>}
                {experiences.map((exp, idx) => (
                  <div key={exp._key} className="space-y-2 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-label-2 font-semibold text-slate-400">경력 {idx + 1}</p>
                      <Button variant="ghost" size="sm" onClick={() => setExperiences((prev) => prev.filter((e) => e._key !== exp._key))}>
                        <Trash2 className="size-4 text-slate-400" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="회사명">
                        <Input
                          value={exp.companyName}
                          onChange={(e) => updateAt(setExperiences, exp._key, { companyName: e.target.value })}
                        />
                      </Field>
                      <Field label="직책/직급">
                        <Input value={exp.position ?? ""} onChange={(e) => updateAt(setExperiences, exp._key, { position: e.target.value })} />
                      </Field>
                      <Field label="입사일">
                        <Input type="date" value={exp.startDate ?? ""} onChange={(e) => updateAt(setExperiences, exp._key, { startDate: e.target.value })} />
                      </Field>
                      <Field label="퇴사일">
                        <Input
                          type="date"
                          value={exp.endDate ?? ""}
                          disabled={exp.isCurrent}
                          onChange={(e) => updateAt(setExperiences, exp._key, { endDate: e.target.value })}
                        />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-label-1 text-slate-600">
                      <Checkbox checked={exp.isCurrent} onCheckedChange={(v) => updateAt(setExperiences, exp._key, { isCurrent: Boolean(v) })} />
                      현재 재직중
                    </label>
                    <Field label="어떤 일을 하셨나요? (예: 고객상담, 거래처 관리, 문서작성)">
                      <Textarea
                        value={exp.responsibilities ?? ""}
                        onChange={(e) => updateAt(setExperiences, exp._key, { responsibilities: e.target.value })}
                        rows={2}
                      />
                      <RewriteButton onClick={() => openRewrite(exp._key, "responsibilities", exp.responsibilities ?? "")} disabled={isRewriting} />
                    </Field>
                    <Field label="기억나는 성과가 있나요? (숫자가 없어도 괜찮습니다)">
                      <Textarea
                        value={exp.achievements ?? ""}
                        onChange={(e) => updateAt(setExperiences, exp._key, { achievements: e.target.value })}
                        rows={2}
                      />
                      <RewriteButton onClick={() => openRewrite(exp._key, "achievements", exp.achievements ?? "")} disabled={isRewriting} />
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
                      <Input value={exp.reasonForLeaving ?? ""} onChange={(e) => updateAt(setExperiences, exp._key, { reasonForLeaving: e.target.value })} />
                    </Field>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {showSection("EDUCATION") && (
            <Card className="mt-4 rounded-xl border-0 ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-2">학력</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEducations((prev) => [...prev, { _key: nextKey("edu"), schoolName: "", orderIndex: prev.length }])}
                >
                  <Plus className="size-4" /> 학력 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {educations.length === 0 && <p className="text-label-1 text-slate-400">최종학력 위주로 간단히 입력하셔도 됩니다.</p>}
                {educations.map((edu, idx) => (
                  <div key={edu._key} className="space-y-2 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-label-2 font-semibold text-slate-400">학력 {idx + 1}</p>
                      <Button variant="ghost" size="sm" onClick={() => setEducations((prev) => prev.filter((e) => e._key !== edu._key))}>
                        <Trash2 className="size-4 text-slate-400" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="학교명">
                        <Input value={edu.schoolName} onChange={(e) => updateAt(setEducations, edu._key, { schoolName: e.target.value })} />
                      </Field>
                      <Field label="전공">
                        <Input value={edu.major ?? ""} onChange={(e) => updateAt(setEducations, edu._key, { major: e.target.value })} />
                      </Field>
                      <Field label="졸업상태">
                        <Input
                          placeholder="졸업/재학/중퇴 등"
                          value={edu.graduationStatus ?? ""}
                          onChange={(e) => updateAt(setEducations, edu._key, { graduationStatus: e.target.value })}
                        />
                      </Field>
                      <Field label="졸업일">
                        <Input type="date" value={edu.graduationDate ?? ""} onChange={(e) => updateAt(setEducations, edu._key, { graduationDate: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {showSection("QUALIFICATION") && (
            <Card className="mt-4 rounded-xl border-0 ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-2">보유 자격</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQualifications((prev) => [...prev, { _key: nextKey("qual"), name: "", orderIndex: prev.length }])}
                >
                  <Plus className="size-4" /> 자격 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {qualifications.length === 0 && <p className="text-label-1 text-slate-400">사회복지사 2급, 요양보호사, 운전면허 등을 추가해보세요.</p>}
                {qualifications.map((q, idx) => (
                  <div key={q._key} className="grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
                    <Field label={`자격명 ${idx + 1}`}>
                      <Input value={q.name} onChange={(e) => updateAt(setQualifications, q._key, { name: e.target.value })} />
                    </Field>
                    <Field label="발급기관">
                      <Input value={q.issuer ?? ""} onChange={(e) => updateAt(setQualifications, q._key, { issuer: e.target.value })} />
                    </Field>
                    <Field label="취득일">
                      <Input type="date" value={q.acquiredAt ?? ""} onChange={(e) => updateAt(setQualifications, q._key, { acquiredAt: e.target.value })} />
                    </Field>
                    <div className="flex items-end justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setQualifications((prev) => prev.filter((x) => x._key !== q._key))}>
                        <Trash2 className="size-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {showSection("SKILLS") && (
            <Card className="mt-4 rounded-xl border-0 ring-1 ring-border">
              <CardHeader>
                <CardTitle className="text-body-2">보유 스킬</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
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
                    <Badge key={s._key} variant="secondary" className="gap-1 rounded-full py-1.5">
                      {s.name}
                      <button onClick={() => setSkills((prev) => prev.filter((x) => x._key !== s._key))} aria-label="삭제">
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {showSection("TRAINING") && (
            <Card className="mt-4 rounded-xl border-0 ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-2">교육/훈련</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTrainings((prev) => [...prev, { _key: nextKey("train"), courseName: "", orderIndex: prev.length }])}
                >
                  <Plus className="size-4" /> 교육 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {trainings.map((t, idx) => (
                  <div key={t._key} className="grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                    <Field label={`과정명 ${idx + 1}`}>
                      <Input value={t.courseName} onChange={(e) => updateAt(setTrainings, t._key, { courseName: e.target.value })} />
                    </Field>
                    <Field label="교육기관">
                      <Input value={t.institution ?? ""} onChange={(e) => updateAt(setTrainings, t._key, { institution: e.target.value })} />
                    </Field>
                    <div className="flex items-end justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setTrainings((prev) => prev.filter((x) => x._key !== t._key))}>
                        <Trash2 className="size-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(showSection("PROJECT") || showSection("ACTIVITY")) && (
            <Card className="mt-4 rounded-xl border-0 ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-body-2">기타 (수상/프로젝트/대외활동/봉사/외국어)</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((prev) => [...prev, { _key: nextKey("item"), sectionType: "PROJECT", title: "", orderIndex: prev.length }])}
                >
                  <Plus className="size-4" /> 항목 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 && <p className="text-label-1 text-slate-400">모든 사용자에게 필수는 아닙니다. 있으면 추가해주세요.</p>}
                {items.map((item) => (
                  <div key={item._key} className="grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
                    <Select value={item.sectionType} onValueChange={(v) => updateAt(setItems, item._key, { sectionType: v as ResumeItemSectionType })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ITEM_SECTION_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="제목" value={item.title} onChange={(e) => updateAt(setItems, item._key, { title: e.target.value })} />
                    <Input placeholder="설명 (선택)" value={item.description ?? ""} onChange={(e) => updateAt(setItems, item._key, { description: e.target.value })} />
                    <Button variant="ghost" size="sm" onClick={() => setItems((prev) => prev.filter((x) => x._key !== item._key))}>
                      <Trash2 className="size-4 text-slate-400" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/*
          저장은 폼을 다 채운 뒤에 하는 동작이라 아래에 둔다.
          폼이 길어 화면 밖으로 나가므로 sticky로 하단에 붙여 스크롤 중에도 닿게 한다.
        */}
        {/* 화면을 벗어나는 액션이 없도록 삭제·목록으로도 이 바에 모은다. 저장은 남는 폭을 다 쓴다. */}
        <div className="sticky bottom-0 z-10 -mx-1 flex items-center gap-2 rounded-xl border border-border bg-white/95 px-4 py-3 shadow-[0_0_16px_-8px_rgba(15,23,42,0.18)] backdrop-blur print:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-rose-500"
            onClick={() => void handleDelete(resume.id)}
          >
            <Trash2 className="size-4" /> 삭제
          </Button>
          {saveMessage && <span className="shrink-0 text-label-2 text-slate-400">{saveMessage}</span>}
          {/* 되돌아가기(목록)와 확정(저장)은 한 묶음으로 오른쪽에 둔다. 삭제는 성격이 달라 왼쪽에 떼어놓는다. */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/resume">목록으로</Link>
            </Button>
            <Button className="min-w-40" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              저장
            </Button>
          </div>
        </div>
      </div>

      {/* 접힌 상태의 세로 손잡이. 모바일은 아래 탭으로 전환하므로 lg 이상에서만 쓴다. */}
      {!showPreview && (
        <div className="hidden print:hidden lg:block">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            aria-expanded={false}
            className="sticky top-4 flex w-11 flex-col items-center gap-2 rounded-xl border border-border bg-white py-4 text-slate-600 transition-colors hover:bg-muted"
          >
            <PanelRightOpen className="size-4" />
            <span className="text-label-2 font-medium [writing-mode:vertical-rl]">미리보기</span>
          </button>
        </div>
      )}

      <div className={cn(activeTab === "form" ? "hidden lg:block" : "block", !showPreview && "lg:hidden")}>
        <div className="sticky top-4 space-y-3">
          <div className="flex items-center justify-between gap-2 print:hidden">
            <p className="text-label-1 font-semibold text-slate-500">미리보기</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="size-4" /> PDF로 저장/인쇄
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden lg:inline-flex"
                onClick={() => setShowPreview(false)}
                aria-expanded
              >
                <PanelRightClose className="size-4" />
                접기
              </Button>
            </div>
          </div>
          <div className="max-h-[80vh] overflow-y-auto rounded-xl bg-slate-100 p-4 ring-1 ring-border print:max-h-none print:overflow-visible print:bg-transparent print:p-0 print:ring-0">
            <ResumePreview detail={currentPreviewDetail()} />
          </div>
        </div>
      </div>
      </div>
    </div>
  );

  async function handleDelete(resumeId: string) {
    if (!window.confirm("이 이력서를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.")) return;
    await deleteResumeAction(resumeId);
    router.push("/resume");
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-label-2 text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function RewriteButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-1 flex items-center gap-1 text-label-2 font-medium text-brand-blue-600 hover:underline disabled:opacity-50"
    >
      {disabled ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
      AI로 다듬기
    </button>
  );
}

function updateAt<T extends { _key: string }>(
  setState: React.Dispatch<React.SetStateAction<T[]>>,
  key: string,
  patch: Partial<T>,
) {
  setState((prev) => prev.map((item) => (item._key === key ? { ...item, ...patch } : item)));
}