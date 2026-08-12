/**
 * STEP 3: Mock 데이터(assessments.mock.ts, occupations.mock.ts)를 기반으로
 * Supabase seed SQL을 생성한다. Mock과 Supabase Seed가 항상 일치하도록
 * 손으로 SQL을 따로 관리하지 않고 이 스크립트로 생성한다.
 *
 * 실행: npx tsx scripts/generate-assessment-seed.ts > supabase/migrations/0017_assessment_v2_seed.sql
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { mockAssessments } from "../src/mocks/assessments.mock";
import { mockOccupations, mockOccupationMatchingRules } from "../src/mocks/occupations.mock";

/**
 * Mock의 사람이 읽기 쉬운 문자열 id(예: "occ-social-worker")를
 * 안정적인(deterministic) uuid로 변환한다. 같은 문자열은 항상 같은 uuid가 되므로
 * 여러 테이블에 걸친 FK 참조가 재실행해도 일관되게 유지된다.
 */
const uuidCache = new Map<string, string>();
function toUuid(rawId: string | undefined | null): string | null {
  if (!rawId) return null;
  const cached = uuidCache.get(rawId);
  if (cached) return cached;
  const hash = createHash("md5").update(`baro-career:v1:${rawId}`).digest("hex");
  const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  uuidCache.set(rawId, uuid);
  return uuid;
}

function esc(v: unknown): string {
  if (v === undefined || v === null) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

function jsonb(v: unknown): string {
  return `'${JSON.stringify(v ?? null).replace(/'/g, "''")}'::jsonb`;
}

const lines: string[] = [];
lines.push("-- 0017_assessment_v2_seed.sql");
lines.push("-- STEP 3: V1 Career Assessment + Occupation Matching Profile Seed");
lines.push("-- 이 파일은 scripts/generate-assessment-seed.ts 로 생성되었다 (Mock 데이터와 항상 일치).");
lines.push("");

// ---- assessments ----------------------------------------------------------
for (const a of mockAssessments) {
  lines.push(
    `insert into public.assessments (id, title, type, description, estimated_minutes, tags, sections, is_active, created_at, updated_at) values (` +
      [
        esc(toUuid(a.id)),
        esc(a.title),
        esc(a.type),
        esc(a.description),
        esc(a.estimatedMinutes),
        jsonb(a.tags),
        jsonb(a.sections),
        esc(a.isActive),
        esc(a.createdAt),
        esc(a.updatedAt),
      ].join(", ") +
      `) on conflict (id) do update set title = excluded.title, sections = excluded.sections, updated_at = excluded.updated_at;`,
  );
}
lines.push("");

// ---- assessment_questions --------------------------------------------------
for (const a of mockAssessments) {
  for (const q of a.questions) {
    lines.push(
      `insert into public.assessment_questions (id, assessment_id, section, question_text, description, answer_type, order_index, required, profile_field, scoring_dimension, min_scale, max_scale, metadata) values (` +
        [
          esc(toUuid(q.id)),
          esc(toUuid(q.assessmentId)),
          esc(q.section),
          esc(q.questionText),
          esc(q.description),
          esc(q.answerType),
          esc(q.orderIndex),
          esc(q.required),
          esc(q.profileField),
          esc(q.scoringDimension),
          esc(q.minScale),
          esc(q.maxScale),
          jsonb(q.metadata ?? {}),
        ].join(", ") +
        `) on conflict (id) do update set question_text = excluded.question_text, order_index = excluded.order_index;`,
    );
  }
}
lines.push("");

// ---- assessment_options -----------------------------------------------------
for (const a of mockAssessments) {
  for (const q of a.questions) {
    for (const o of q.options ?? []) {
      lines.push(
        `insert into public.assessment_options (id, question_id, option_text, value, score_map, profile_value, tags, order_index) values (` +
          [
            esc(toUuid(o.id)),
            esc(toUuid(o.questionId)),
            esc(o.optionText),
            esc(o.value),
            jsonb(o.scoreMap ?? {}),
            jsonb(o.profileValue ?? null),
            jsonb(o.tags ?? []),
            esc(o.sortOrder),
          ].join(", ") +
          `) on conflict (id) do update set option_text = excluded.option_text, order_index = excluded.order_index;`,
      );
    }
  }
}
lines.push("");

// ---- occupations (V1 20개, tags 등 추가 컬럼 upsert) -------------------------
for (const o of mockOccupations) {
  lines.push(
    `insert into public.occupations (id, name, category, description, is_midcareer_friendly, status, tags, related_content_ids, required_qualifications, recommended_age_groups, preferred_employment_types, preferred_regions, job_category_code, created_at, updated_at) values (` +
      [
        esc(toUuid(o.id)),
        esc(o.name),
        esc(o.category),
        esc(o.description),
        esc(o.isMidcareerFriendly),
        esc(o.status),
        jsonb(o.tags ?? []),
        jsonb(o.relatedContentIds ?? []),
        jsonb(o.requiredQualifications ?? []),
        jsonb(o.recommendedAgeGroups ?? []),
        jsonb(o.preferredEmploymentTypes ?? []),
        jsonb(o.preferredRegions ?? []),
        esc(o.jobCategoryCode),
        esc(o.createdAt),
        esc(o.updatedAt),
      ].join(", ") +
      `) on conflict (id) do update set name = excluded.name, tags = excluded.tags, updated_at = excluded.updated_at;`,
  );
}
lines.push("");

// ---- occupation_matching_rules ---------------------------------------------
for (const r of mockOccupationMatchingRules) {
  lines.push(
    `insert into public.occupation_matching_rules (id, occupation_id, dimension, target_value, weight, is_required, metadata) values (` +
      [
        esc(toUuid(r.id)),
        esc(toUuid(r.occupationId)),
        esc(r.dimension),
        esc(r.targetValue),
        esc(r.weight),
        esc(r.isRequired ?? false),
        jsonb(r.metadata ?? {}),
      ].join(", ") +
      `) on conflict (id) do update set target_value = excluded.target_value, weight = excluded.weight;`,
  );
}
lines.push("");

const outPath = resolve(__dirname, "../supabase/migrations/0017_assessment_v2_seed.sql");
writeFileSync(outPath, lines.join("\n") + "\n", { encoding: "utf8" });
console.log(`Wrote ${outPath}`);
