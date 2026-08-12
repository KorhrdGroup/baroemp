import type { Assessment, AssessmentOption, AssessmentQuestion } from "@/types";
import type { AssessmentInput, AssessmentRepository } from "../assessment-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { unwrapList, unwrapMaybe } from "./query-helpers";

type SupabaseClientLike = NonNullable<ReturnType<typeof createAdminSupabaseClient>>;

function mapOption(row: Record<string, unknown>): AssessmentOption {
  return {
    id: String(row.id),
    questionId: String(row.question_id),
    optionText: String(row.option_text ?? row.label ?? ""),
    value: String(row.value ?? ""),
    scoreMap: (row.score_map as AssessmentOption["scoreMap"]) ?? undefined,
    profileValue: row.profile_value ?? undefined,
    tags: (row.tags as AssessmentOption["tags"]) ?? undefined,
    sortOrder: Number(row.order_index ?? row.sort_order ?? 0),
  };
}

function mapQuestion(row: Record<string, unknown>, options: AssessmentOption[]): AssessmentQuestion {
  return {
    id: String(row.id),
    assessmentId: String(row.assessment_id),
    section: String(row.section ?? "basic"),
    questionText: String(row.question_text ?? row.prompt ?? ""),
    description: (row.description as string | null) ?? undefined,
    answerType: (row.answer_type as AssessmentQuestion["answerType"]) ?? "SINGLE",
    orderIndex: Number(row.order_index ?? row.sort_order ?? 0),
    required: row.required !== false,
    profileField: (row.profile_field as string | null) ?? undefined,
    scoringDimension: (row.scoring_dimension as string | null) ?? undefined,
    options: options.sort((a, b) => a.sortOrder - b.sortOrder),
    minScale: (row.min_scale as number | null) ?? undefined,
    maxScale: (row.max_scale as number | null) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
  };
}

async function loadAssessmentQuestions(
  client: SupabaseClientLike,
  assessmentId: string,
): Promise<AssessmentQuestion[]> {
  const questionsResult = await client
    .from("assessment_questions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("order_index", { ascending: true });
  const questionRows = unwrapList("AssessmentRepository.loadQuestions", questionsResult);
  if (questionRows.length === 0) return [];

  const questionIds = questionRows.map((q) => q.id as string);
  const optionsResult = await client
    .from("assessment_options")
    .select("*")
    .in("question_id", questionIds)
    .order("order_index", { ascending: true });
  const optionRows = unwrapList("AssessmentRepository.loadOptions", optionsResult);

  const optionsByQuestion = new Map<string, AssessmentOption[]>();
  for (const row of optionRows as Record<string, unknown>[]) {
    const option = mapOption(row);
    const list = optionsByQuestion.get(option.questionId) ?? [];
    list.push(option);
    optionsByQuestion.set(option.questionId, list);
  }

  return (questionRows as Record<string, unknown>[]).map((row) =>
    mapQuestion(row, optionsByQuestion.get(String(row.id)) ?? []),
  );
}

function mapAssessment(row: Record<string, unknown>, questions: AssessmentQuestion[]): Assessment {
  return {
    id: String(row.id),
    title: String(row.title),
    type: row.type as Assessment["type"],
    description: String(row.description ?? ""),
    estimatedMinutes: Number(row.estimated_minutes ?? 5),
    sections: (row.sections as Assessment["sections"]) ?? [],
    questions,
    tags: (row.tags as Assessment["tags"]) ?? [],
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * assessment_questions/options 를 upsert 한다.
 * V1 관리자 화면은 문항 추가/삭제 UI가 없고 순서(orderIndex) 변경만 지원하므로,
 * 여기서도 upsert만 지원한다 (목록에서 빠진 기존 행을 지우는 diff는 다루지 않는다).
 */
async function upsertQuestions(
  client: SupabaseClientLike,
  assessmentId: string,
  questions: AssessmentQuestion[],
): Promise<void> {
  for (const question of questions) {
    const { error: qError } = await client.from("assessment_questions").upsert({
      id: question.id,
      assessment_id: assessmentId,
      prompt: question.questionText,
      question_text: question.questionText,
      description: question.description ?? null,
      answer_type: question.answerType,
      order_index: question.orderIndex,
      required: question.required,
      profile_field: question.profileField ?? null,
      scoring_dimension: question.scoringDimension ?? null,
      min_scale: question.minScale ?? null,
      max_scale: question.maxScale ?? null,
      section: question.section,
      metadata: question.metadata ?? {},
    });
    if (qError) throwDataSourceError("AssessmentRepository.upsertQuestion", qError);

    for (const option of question.options ?? []) {
      const { error: oError } = await client.from("assessment_options").upsert({
        id: option.id,
        question_id: question.id,
        label: option.optionText,
        option_text: option.optionText,
        value: option.value,
        score_map: option.scoreMap ?? {},
        profile_value: option.profileValue ?? null,
        tags: option.tags ?? [],
        order_index: option.sortOrder,
      });
      if (oError) throwDataSourceError("AssessmentRepository.upsertOption", oError);
    }
  }
}

export function createSupabaseAssessmentRepository(): AssessmentRepository | null {
  const client = createAdminSupabaseClient();
  if (!client) return null;

  return {
    async findAll() {
      const result = await client.from("assessments").select("*").order("created_at", { ascending: false });
      const rows = unwrapList("AssessmentRepository.findAll", result);
      const assessments: Assessment[] = [];
      for (const row of rows as Record<string, unknown>[]) {
        const questions = await loadAssessmentQuestions(client, row.id as string);
        assessments.push(mapAssessment(row, questions));
      }
      return assessments;
    },
    async findById(id) {
      const result = await client.from("assessments").select("*").eq("id", id).maybeSingle();
      const row = unwrapMaybe("AssessmentRepository.findById", result);
      if (!row) return null;
      const questions = await loadAssessmentQuestions(client, id);
      return mapAssessment(row as Record<string, unknown>, questions);
    },
    async create(input: AssessmentInput) {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("assessments")
        .insert({
          title: input.title,
          type: input.type,
          description: input.description ?? "",
          estimated_minutes: input.estimatedMinutes ?? 5,
          sections: input.sections ?? [],
          tags: input.tags ?? [],
          is_active: input.isActive ?? true,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();
      if (error || !data) throwDataSourceError("AssessmentRepository.create", error ?? new Error("no data returned"));
      const assessmentRow = data as Record<string, unknown>;
      if (input.questions?.length) {
        await upsertQuestions(client, assessmentRow.id as string, input.questions);
      }
      const questions = await loadAssessmentQuestions(client, assessmentRow.id as string);
      return mapAssessment(assessmentRow, questions);
    },
    async update(id, input) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.title !== undefined) patch.title = input.title;
      if (input.type !== undefined) patch.type = input.type;
      if (input.description !== undefined) patch.description = input.description;
      if (input.estimatedMinutes !== undefined) patch.estimated_minutes = input.estimatedMinutes;
      if (input.sections !== undefined) patch.sections = input.sections;
      if (input.tags !== undefined) patch.tags = input.tags;
      if (input.isActive !== undefined) patch.is_active = input.isActive;

      const result = await client.from("assessments").update(patch).eq("id", id).select("*").maybeSingle();
      const row = unwrapMaybe("AssessmentRepository.update", result);
      if (!row) return null;

      if (input.questions !== undefined) {
        await upsertQuestions(client, id, input.questions);
      }
      const questions = await loadAssessmentQuestions(client, id);
      return mapAssessment(row as Record<string, unknown>, questions);
    },
    async remove(id) {
      const { error } = await client.from("assessments").delete().eq("id", id);
      if (error) throwDataSourceError("AssessmentRepository.remove", error);
      return true;
    },
  };
}
