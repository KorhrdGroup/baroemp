"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CoverLetterQuestionType,
  CoverLetterTemplate,
  CoverLetterTemplateQuestion,
  ResumeSectionCode,
  ResumeTemplate,
} from "@/types";
import {
  saveCoverLetterTemplateAction,
  saveResumeTemplateAction,
  toggleCoverLetterTemplateStatusAction,
  toggleResumeTemplateStatusAction,
} from "./resume-admin-actions";
import type { ResumeUsageStats } from "./resume-admin-actions";

const ALL_SECTIONS: ResumeSectionCode[] = [
  "BASIC_INFO",
  "SUMMARY",
  "EXPERIENCE",
  "EDUCATION",
  "QUALIFICATION",
  "TRAINING",
  "SKILLS",
  "PROJECT",
  "ACTIVITY",
];

function ResumeTemplateFormDialog({
  template,
  onSaved,
}: {
  template?: ResumeTemplate;
  onSaved: (t: ResumeTemplate) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(template?.code ?? "");
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [targetType, setTargetType] = useState(template?.targetType ?? "general");
  const [sections, setSections] = useState<ResumeSectionCode[]>(template?.sections ?? [...ALL_SECTIONS]);
  const [isSaving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleSection(section: ResumeSectionCode) {
    setSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]));
  }
  function moveSection(section: ResumeSectionCode, dir: -1 | 1) {
    setSections((prev) => {
      const idx = prev.indexOf(section);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function handleSubmit() {
    if (!code.trim() || !name.trim()) {
      setError("코드와 이름은 필수입니다.");
      return;
    }
    startSave(async () => {
      try {
        setError(null);
        const saved = await saveResumeTemplateAction({
          id: template?.id,
          code: code.trim(),
          name: name.trim(),
          description,
          targetType,
          sections,
          status: template?.status ?? "active",
          orderIndex: template?.orderIndex ?? 99,
        });
        onSaved(saved);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={template ? "outline" : "default"} size="sm">
          {template ? "수정" : (
            <>
              <Plus className="size-4" /> Template 추가
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "이력서 Template 수정" : "이력서 Template 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-label-2 text-slate-500">코드</Label>
              <Input className="mt-1" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={Boolean(template)} />
            </div>
            <div>
              <Label className="text-label-2 text-slate-500">대상 유형</Label>
              <Input className="mt-1" value={targetType} onChange={(e) => setTargetType(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-label-2 text-slate-500">이름</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-label-2 text-slate-500">설명</Label>
            <Textarea className="mt-1" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label className="text-label-2 text-slate-500">Section 구성 (체크 + 순서)</Label>
            <div className="mt-2 space-y-1.5">
              {sections.map((section) => (
                <div key={section} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-label-1">
                  <span>{section}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => moveSection(section, -1)}>
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => moveSection(section, 1)}>
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleSection(section)}>
                      <Trash2 className="size-3.5 text-rose-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_SECTIONS.filter((s) => !sections.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSection(s)}
                  className="rounded-full border border-dashed border-border px-2.5 py-1 text-label-2 text-slate-500 hover:border-brand-blue-300"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-label-1 text-rose-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResumeTemplatesTab({ initialTemplates }: { initialTemplates: ResumeTemplate[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function upsert(t: ResumeTemplate) {
    setTemplates((prev) => (prev.some((x) => x.id === t.id) ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t]));
  }

  async function handleToggle(id: string) {
    setPendingId(id);
    const updated = await toggleResumeTemplateStatusAction(id);
    if (updated) upsert(updated);
    setPendingId(null);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <ResumeTemplateFormDialog onSaved={upsert} />
      </div>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-label-2">이름</TableHead>
              <TableHead className="text-label-2">코드</TableHead>
              <TableHead className="text-label-2">Section</TableHead>
              <TableHead className="text-label-2">상태</TableHead>
              <TableHead className="text-label-2 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id} className="text-label-1">
                <TableCell className="font-semibold">{t.name}</TableCell>
                <TableCell className="text-slate-500">{t.code}</TableCell>
                <TableCell className="max-w-[260px] truncate text-slate-500">{t.sections.join(", ")}</TableCell>
                <TableCell>
                  <Badge variant={t.status === "active" ? "default" : "outline"} className="rounded-full text-label-2">
                    {t.status === "active" ? "활성" : "비활성"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ResumeTemplateFormDialog template={t} onSaved={upsert} />
                    <Button variant="outline" size="sm" onClick={() => handleToggle(t.id)} disabled={pendingId === t.id}>
                      {pendingId === t.id ? <Loader2 className="size-3.5 animate-spin" /> : t.status === "active" ? "비활성화" : "활성화"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CoverLetterTemplateFormDialog({
  template,
  onSaved,
}: {
  template?: CoverLetterTemplate;
  onSaved: (t: CoverLetterTemplate) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(template?.code ?? "");
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [targetType, setTargetType] = useState(template?.targetType ?? "general");
  const [questions, setQuestions] = useState<CoverLetterTemplateQuestion[]>(
    template?.defaultQuestions ?? [{ questionType: "MOTIVATION", question: "지원동기를 알려주세요." }],
  );
  const [isSaving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateQuestion(idx: number, patch: Partial<CoverLetterTemplateQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function handleSubmit() {
    if (!code.trim() || !name.trim()) {
      setError("코드와 이름은 필수입니다.");
      return;
    }
    startSave(async () => {
      try {
        setError(null);
        const saved = await saveCoverLetterTemplateAction({
          id: template?.id,
          code: code.trim(),
          name: name.trim(),
          description,
          targetType,
          defaultQuestions: questions,
          status: template?.status ?? "active",
          orderIndex: template?.orderIndex ?? 99,
        });
        onSaved(saved);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={template ? "outline" : "default"} size="sm">
          {template ? "수정" : (
            <>
              <Plus className="size-4" /> Template 추가
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "자기소개서 Template 수정" : "자기소개서 Template 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-label-2 text-slate-500">코드</Label>
              <Input className="mt-1" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={Boolean(template)} />
            </div>
            <div>
              <Label className="text-label-2 text-slate-500">대상 유형</Label>
              <Input className="mt-1" value={targetType} onChange={(e) => setTargetType(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-label-2 text-slate-500">이름</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-label-2 text-slate-500">설명</Label>
            <Textarea className="mt-1" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label className="text-label-2 text-slate-500">문항</Label>
            <div className="mt-2 space-y-2">
              {questions.map((q, idx) => (
                <div key={idx} className="space-y-1.5 rounded-lg bg-slate-50 p-3">
                  <div className="flex gap-2">
                    <Input
                      className="h-8 flex-1"
                      placeholder="문항 유형 (예: MOTIVATION)"
                      value={q.questionType}
                      onChange={(e) => updateQuestion(idx, { questionType: e.target.value as CoverLetterQuestionType })}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="size-3.5 text-rose-400" />
                    </Button>
                  </div>
                  <Input
                    className="h-8"
                    placeholder="질문 내용"
                    value={q.question}
                    onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setQuestions((prev) => [...prev, { questionType: "CUSTOM", question: "" }])}
            >
              <Plus className="size-3.5" /> 문항 추가
            </Button>
          </div>
          {error && <p className="text-label-1 text-rose-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CoverLetterTemplatesTab({ initialTemplates }: { initialTemplates: CoverLetterTemplate[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function upsert(t: CoverLetterTemplate) {
    setTemplates((prev) => (prev.some((x) => x.id === t.id) ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t]));
  }

  async function handleToggle(id: string) {
    setPendingId(id);
    const updated = await toggleCoverLetterTemplateStatusAction(id);
    if (updated) upsert(updated);
    setPendingId(null);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <CoverLetterTemplateFormDialog onSaved={upsert} />
      </div>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-label-2">이름</TableHead>
              <TableHead className="text-label-2">코드</TableHead>
              <TableHead className="text-label-2">문항수</TableHead>
              <TableHead className="text-label-2">상태</TableHead>
              <TableHead className="text-label-2 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id} className="text-label-1">
                <TableCell className="font-semibold">{t.name}</TableCell>
                <TableCell className="text-slate-500">{t.code}</TableCell>
                <TableCell>{t.defaultQuestions.length}개</TableCell>
                <TableCell>
                  <Badge variant={t.status === "active" ? "default" : "outline"} className="rounded-full text-label-2">
                    {t.status === "active" ? "활성" : "비활성"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <CoverLetterTemplateFormDialog template={t} onSaved={upsert} />
                    <Button variant="outline" size="sm" onClick={() => handleToggle(t.id)} disabled={pendingId === t.id}>
                      {pendingId === t.id ? <Loader2 className="size-3.5 animate-spin" /> : t.status === "active" ? "비활성화" : "활성화"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function UsageTab({ stats }: { stats: ResumeUsageStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "전체 이력서", value: stats.totalResumes },
          { label: "완성 이력서", value: stats.completedResumes },
          { label: "평균 완성도", value: `${stats.averageCompleteness}%` },
          { label: "자기소개서", value: stats.totalCoverLetters },
          { label: "공고연결 이력서", value: stats.jobLinkedResumes },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-label-2 text-slate-400">{s.label}</p>
            <p className="mt-1 text-title-3 font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-label-2">Template</TableHead>
              <TableHead className="text-label-2">작성 건수</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.byTemplate.map((row) => (
              <TableRow key={row.templateId ?? "none"} className="text-label-1">
                <TableCell className="font-semibold">{row.templateName}</TableCell>
                <TableCell>{row.count}건</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function AdminResumeTemplates({
  resumeTemplates,
  coverLetterTemplates,
  usageStats,
}: {
  resumeTemplates: ResumeTemplate[];
  coverLetterTemplates: CoverLetterTemplate[];
  usageStats: ResumeUsageStats;
}) {
  return (
    <Tabs defaultValue="resume">
      <TabsList>
        <TabsTrigger value="resume">이력서 Template</TabsTrigger>
        <TabsTrigger value="cover-letter">자기소개서 Template</TabsTrigger>
        <TabsTrigger value="usage">사용현황</TabsTrigger>
      </TabsList>
      <TabsContent value="resume" className="mt-4">
        <ResumeTemplatesTab initialTemplates={resumeTemplates} />
      </TabsContent>
      <TabsContent value="cover-letter" className="mt-4">
        <CoverLetterTemplatesTab initialTemplates={coverLetterTemplates} />
      </TabsContent>
      <TabsContent value="usage" className="mt-4">
        <UsageTab stats={usageStats} />
      </TabsContent>
    </Tabs>
  );
}
