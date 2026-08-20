"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { labelLeadStatus } from "@/lib/labels";
import type { Assessment } from "@/types";
import type { AssessmentAnalyticsSnapshot } from "@/services/assessment-analytics.service";
import { toggleAssessmentActiveAction, updateQuestionOrderAction } from "@/app/admin/actions";

export interface AssessmentResultRow {
  resultId: string;
  sessionId: string;
  userId?: string;
  name: string;
  ageGroup: string;
  region: string;
  completedAt: string;
  topOccupationName: string;
  topScore: number;
  desiredStartTiming: string;
  educationWillingness: number;
  leadScore?: number;
  leadStatus?: string;
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="rounded-xl border-0 py-0 shadow-none ring-1 ring-slate-200">
      <CardContent className="px-4 py-4">
        <p className="text-label-2 text-slate-400">{label}</p>
        <p className="mt-1 text-title-2 font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function QuestionOrderInput({ assessmentId, questionId, orderIndex }: { assessmentId: string; questionId: string; orderIndex: number }) {
  const [value, setValue] = useState(orderIndex);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-8 w-16 text-label-2"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending || value === orderIndex}
        className="h-8 px-2 text-label-2"
        onClick={() => startTransition(async () => { await updateQuestionOrderAction(assessmentId, questionId, value); })}
      >
        저장
      </Button>
    </div>
  );
}

function ActiveToggleButton({ assessmentId, isActive }: { assessmentId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant={isActive ? "outline" : "default"}
      disabled={pending}
      className={isActive ? "h-8 rounded-lg text-label-2" : "h-8 rounded-lg bg-brand-blue-400 text-label-2 hover:bg-brand-blue-600"}
      onClick={() => startTransition(async () => { await toggleAssessmentActiveAction(assessmentId); })}
    >
      {isActive ? "비활성화" : "활성화"}
    </Button>
  );
}

export function AssessmentDetailTabs({
  assessment,
  resultRows,
  analytics,
}: {
  assessment: Assessment;
  resultRows: AssessmentResultRow[];
  analytics: AssessmentAnalyticsSnapshot;
}) {
  const questions = [...assessment.questions].sort((a, b) => a.orderIndex - b.orderIndex);
  const sectionLabel = new Map(assessment.sections.map((s) => [s.key, s.label]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-title-3 font-bold text-slate-900">{assessment.title}</h1>
          <p className="mt-1 text-label-1 text-slate-500">{assessment.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={assessment.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}>
            {assessment.isActive ? "활성" : "비활성"}
          </Badge>
          <ActiveToggleButton assessmentId={assessment.id} isActive={assessment.isActive} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="questions">문항</TabsTrigger>
          <TabsTrigger value="results">결과</TabsTrigger>
          <TabsTrigger value="analytics">분석</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard label="섹션 수" value={assessment.sections.length} />
            <KpiCard label="문항 수" value={assessment.questions.length} />
            <KpiCard label="예상 소요시간" value={`${assessment.estimatedMinutes}분`} />
            <KpiCard label="생성일" value={assessment.createdAt.slice(0, 10)} />
          </div>
          <Card className="mt-4 rounded-xl border-0 py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="border-b border-slate-100 px-4 py-3">
              <CardTitle className="text-label-1">섹션 구성</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 px-4 py-4">
              {[...assessment.sections].sort((a, b) => a.order - b.order).map((section) => (
                <Badge key={section.key} variant="outline" className="rounded-md">
                  {section.order}. {section.label} ({questions.filter((q) => q.section === section.key).length}문항)
                </Badge>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="mt-4">
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-label-2">순서</TableHead>
                    <TableHead className="text-label-2">섹션</TableHead>
                    <TableHead className="text-label-2">질문</TableHead>
                    <TableHead className="text-label-2">유형</TableHead>
                    <TableHead className="text-label-2">필수</TableHead>
                    <TableHead className="text-label-2">Profile Field</TableHead>
                    <TableHead className="text-label-2">Dimension</TableHead>
                    <TableHead className="text-label-2">선택지</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q) => (
                    <TableRow key={q.id} className="text-label-1">
                      <TableCell>
                        <QuestionOrderInput assessmentId={assessment.id} questionId={q.id} orderIndex={q.orderIndex} />
                      </TableCell>
                      <TableCell>{sectionLabel.get(q.section) ?? q.section}</TableCell>
                      <TableCell className="max-w-xs truncate">{q.questionText}</TableCell>
                      <TableCell>{q.answerType}</TableCell>
                      <TableCell>{q.required ? "필수" : "선택"}</TableCell>
                      <TableCell>{q.profileField ?? "-"}</TableCell>
                      <TableCell>{q.scoringDimension ?? "-"}</TableCell>
                      <TableCell>{q.options?.length ?? 0}개</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-label-2">이름</TableHead>
                    <TableHead className="text-label-2">연령대</TableHead>
                    <TableHead className="text-label-2">지역</TableHead>
                    <TableHead className="text-label-2">검사일</TableHead>
                    <TableHead className="text-label-2">TOP1 직업</TableHead>
                    <TableHead className="text-label-2">TOP1 점수</TableHead>
                    <TableHead className="text-label-2">취업희망시기</TableHead>
                    <TableHead className="text-label-2">교육의향</TableHead>
                    <TableHead className="text-label-2">Lead Score</TableHead>
                    <TableHead className="text-label-2">상담상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultRows.map((row) => (
                    <TableRow key={row.resultId} className="text-label-1">
                      <TableCell className="font-semibold">
                        {row.userId ? (
                          <Link href={`/admin/users/${row.userId}`} className="text-brand-blue-600 hover:underline">
                            {row.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">{row.name}</span>
                        )}
                      </TableCell>
                      <TableCell>{row.ageGroup}</TableCell>
                      <TableCell>{row.region}</TableCell>
                      <TableCell>{row.completedAt.slice(0, 10)}</TableCell>
                      <TableCell>{row.topOccupationName}</TableCell>
                      <TableCell className="font-semibold text-brand-blue-600">{row.topScore}</TableCell>
                      <TableCell>{row.desiredStartTiming}</TableCell>
                      <TableCell>{row.educationWillingness}</TableCell>
                      <TableCell>{row.leadScore ?? "-"}</TableCell>
                      <TableCell>{row.leadStatus ? labelLeadStatus(row.leadStatus as never) : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {resultRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-slate-400">
                        아직 완료된 검사 결과가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard label="검사 시작 수" value={analytics.startedCount} />
            <KpiCard label="완료 수" value={analytics.completedCount} />
            <KpiCard label="완료율" value={`${analytics.completionRate}%`} />
            <KpiCard label="평균 검사시간" value={`${analytics.averageDurationMinutes}분`} />
            <KpiCard label="검사완료자 평균 Lead Score" value={analytics.averageLeadScoreOfCompleters} />
            <KpiCard label="A Lead 전환 수" value={analytics.gradeAConversionCount} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-xl border-0 py-0 shadow-none ring-1 ring-slate-200">
              <CardHeader className="border-b border-slate-100 px-4 py-3">
                <CardTitle className="text-label-1">TOP 추천직업</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 py-4 text-label-1">
                {analytics.topOccupations.map((o) => (
                  <div key={o.occupationId} className="flex items-center justify-between">
                    <span>{o.occupationName}</span>
                    <span className="text-slate-500">{o.count}건 · 평균 {o.avgScore}점</span>
                  </div>
                ))}
                {analytics.topOccupations.length === 0 && <p className="text-slate-400">데이터 없음</p>}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-0 py-0 shadow-none ring-1 ring-slate-200">
              <CardHeader className="border-b border-slate-100 px-4 py-3">
                <CardTitle className="text-label-1">지역별 완료 분포</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 py-4 text-label-1">
                {analytics.regionBreakdown.map((r) => (
                  <div key={r.key} className="flex items-center justify-between">
                    <span>{r.key}</span>
                    <span className="text-slate-500">{r.count}건</span>
                  </div>
                ))}
                {analytics.regionBreakdown.length === 0 && <p className="text-slate-400">데이터 없음</p>}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-0 py-0 shadow-none ring-1 ring-slate-200">
              <CardHeader className="border-b border-slate-100 px-4 py-3">
                <CardTitle className="text-label-1">교육의향 분포</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 py-4 text-label-1">
                {analytics.educationWillingnessDistribution.map((e) => (
                  <div key={e.bucket} className="flex items-center justify-between">
                    <span>{e.bucket}</span>
                    <span className="text-slate-500">{e.count}건</span>
                  </div>
                ))}
                {analytics.educationWillingnessDistribution.length === 0 && <p className="text-slate-400">데이터 없음</p>}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-0 py-0 shadow-none ring-1 ring-slate-200">
              <CardHeader className="border-b border-slate-100 px-4 py-3">
                <CardTitle className="text-label-1">취업희망시기 분포</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 py-4 text-label-1">
                {analytics.desiredStartTimingDistribution.map((t) => (
                  <div key={t.key} className="flex items-center justify-between">
                    <span>{t.key}</span>
                    <span className="text-slate-500">{t.count}건</span>
                  </div>
                ))}
                {analytics.desiredStartTimingDistribution.length === 0 && <p className="text-slate-400">데이터 없음</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
