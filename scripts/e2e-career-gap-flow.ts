/**
 * STEP 7.5: Career Gap Engine 실 Supabase E2E.
 *
 * 실제 서비스 레이어(market-requirement.service / user-requirement-status.service /
 * career-gap-engine.service / lead-score.service)를 통해
 * "회원 생성 -> Career Profile/자격/스킬/이력서/자기소개서 준비 -> 실제 채용공고(jobs) 투입
 *  -> 시장 요구조건 통계 계산 -> 직업 단위 분석 -> 취업처 단위 분석 -> Readiness Score
 *  -> Gap Item(충족/미충족/확인필요) -> Counterfactual Simulation(지원가능 공고 변화)
 *  -> Resume/Cover Letter Gap -> Content 추천 -> Activity/Lead 반영 -> Mypage/Admin 요약 -> RLS"
 * 전 구간을 1회 실행 검증한다.
 *
 * e2e-resume-flow.ts와 동일한 이유로 Next.js 요청 컨텍스트(쿠키 기반 세션)가 없는 순수 Node
 * 스크립트이므로 Server Action을 직접 호출하지 않고, Action이 내부적으로 호출하는 서비스 함수를
 * 동일 인자로 직접 호출한다. "클라이언트가 임의 userId로 남의 분석에 접근할 수 없는지"는
 * Server Action 계층의 requireSessionUser() 코드 리뷰 + smoke:auth로 별도 확인한다.
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/e2e-career-gap-flow.ts
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  getCareerProfileRepository,
  getCareerRequirementRepository,
  getCoverLetterTemplateRepository,
  getEmploymentDestinationRepository,
  getJobRepository,
  getJobRequirementRepository,
  getOccupationRepository,
  getResumeTemplateRepository,
  getUserQualificationRepository,
  getUserSkillRepository,
  findCareerProfileByUserId,
} from "@/lib/repositories";
import { createResumeFromTemplate, saveResumeDetail } from "@/services/resume.service";
import { createCoverLetterFromTemplate, saveCoverLetterDetail } from "@/services/cover-letter.service";
import { recalculateMarketSnapshot } from "@/services/market-requirement.service";
import { runCareerGapAnalysis, getCareerGapResult, listCareerGapSummariesForUser } from "@/services/career-gap-engine.service";
import { getUserCrmDetail } from "@/services/user-crm.service";
import { runReadOnlyQuery } from "./supabase-management-api";
import type { JobInput } from "@/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`검증 실패: ${message}`);
}

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "supabase") {
    console.error("DATA_SOURCE_MODE=supabase 가 아닙니다. .env.local을 확인하세요.");
    process.exit(1);
  }

  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Supabase Admin Client 생성 실패 (서비스 키 확인 필요)");
  const email = `e2e-career-gap-${Date.now()}@baro.local`;
  let userId: string | undefined;
  const testJobIds: string[] = [];
  const snapshotIds: string[] = [];

  try {
    console.log("▶ Career Gap Engine (STEP 7.5) 실제 서비스 레이어 Flow 검증 시작 (Supabase Mode)\n");

    // 0. 임시 회원 생성 (0033 트리거가 profiles/user_roles/career_profiles/user_acquisition 자동 생성)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: "password123!",
      email_confirm: true,
    });
    if (createErr || !created.user) throw new Error(`임시 회원 생성 실패: ${createErr?.message}`);
    userId = created.user.id;
    await admin.from("profiles").update({ name: "E2E CareerGap 테스트" }).eq("id", userId);
    console.log(`  ✅ 0. 임시 회원 생성 — user_id=${userId}`);

    // 1. 분석 대상 직업/취업처 조회 (0017/0040 시드: 사회복지사 -> 재가복지센터)
    const occupations = await getOccupationRepository().findAll();
    const occupation = occupations.find((o) => o.name === "사회복지사" && o.jobCategoryCode === "social_worker");
    if (!occupation) throw new Error("시드 직업 '사회복지사'를 찾을 수 없음 (0017 시드 확인 필요)");
    const destinations = await getEmploymentDestinationRepository().findAll({ occupationId: occupation.id, status: "active" });
    const destination = destinations.find((d) => d.name === "재가복지센터");
    if (!destination) throw new Error("시드 취업처 '재가복지센터'를 찾을 수 없음 (0040 시드 확인 필요)");
    console.log(`  ✅ 1. 대상 조회 — occupation=${occupation.name}(${occupation.id}), destination=${destination.name}(${destination.id})`);

    // 2. 실제 채용공고(jobs) 투입 — Requirement Normalizer/시장 통계/Job->Destination 분류(스펙 5/6/10번)를
    //    검증할 수 있도록 필수/우대 마커와 취업처 분류 키워드를 실 텍스트로 구성한다.
    const jobRepo = getJobRepository();
    const now = new Date().toISOString();
    const officeJobsCount = 5;
    const homeCareJobsCount = 6;

    for (let i = 0; i < officeJobsCount; i++) {
      const input: JobInput = {
        title: `사회복지사 사무행정 채용 ${i + 1}`,
        companyName: `한평생사회복지법인${i + 1}`,
        jobCategory: "social_worker",
        region: "seoul",
        workType: "full_time",
        isBeginnerFriendly: true,
        preferredQualifications: ["사회복지사 2급"],
        tags: [],
        description: "사회복지사 2급 필수 소지자. 컴퓨터 활용(한글/엑셀) 가능자 우대. 사례관리 및 상담업무 수행.",
        requirements: "사회복지사 2급 필수, 컴퓨터 활용 가능자 우대",
        status: "published",
        isActive: true,
        postedAt: now,
      };
      const job = await jobRepo.create(input);
      testJobIds.push(job.id);
    }

    for (let i = 0; i < homeCareJobsCount; i++) {
      const input: JobInput = {
        title: `재가복지센터 방문요양 사회복지사 모집 ${i + 1}`,
        companyName: `한평생재가복지센터${i + 1}`,
        jobCategory: "social_worker",
        region: "seoul",
        workType: "full_time",
        isBeginnerFriendly: false,
        preferredQualifications: [],
        tags: ["운전"],
        description: "재가복지 방문요양 업무. 사회복지사 2급 필수. 운전 가능자 우대. 장기요양 경험자 우대.",
        requirements: "사회복지사 2급 필수, 운전 가능자 우대, 장기요양 경험자 우대",
        status: "published",
        isActive: true,
        postedAt: now,
      };
      const job = await jobRepo.create(input);
      testJobIds.push(job.id);
    }
    console.log(`  ✅ 2. 테스트 채용공고 ${testJobIds.length}건 투입 (사무직 ${officeJobsCount}건 + 재가복지 방문요양 ${homeCareJobsCount}건)`);

    // 3. Career Profile 보강 (스펙 13번: canDrive는 트리거 기본값 false = "운전 불가"로 그대로 사용)
    const profile = await findCareerProfileByUserId(userId);
    if (!profile) throw new Error("career_profiles가 트리거로 생성되지 않음");
    await getCareerProfileRepository().update(profile.id, {
      ageGroup: "50s",
      region: "seoul",
      employmentStatus: "career_break",
      desiredJobCategories: ["social_worker"],
      heldQualifications: ["사회복지사 2급"],
    });
    console.log("  ✅ 3. Career Profile 보강 — 희망직종=social_worker, 지역=seoul, canDrive=false(기본값 유지)");

    // 4. 이력서 생성 — 자격/스킬 항목은 비워두고 경력만 채워 "보유역량이 이력서에 충분히
    //    드러나지 않는" Resume Gap(스펙 23번) 상황을 만든다.
    const resumeTemplates = await getResumeTemplateRepository().findAll({ status: "active" });
    const standardTemplate = resumeTemplates.find((t) => t.code === "STANDARD");
    if (!standardTemplate) throw new Error("STANDARD Resume Template을 찾을 수 없음");
    const createdResume = await createResumeFromTemplate({ userId, templateId: standardTemplate.id, title: "E2E CareerGap 이력서" });
    const resumeId = createdResume.resume.id;
    await saveResumeDetail({
      resume: { id: resumeId, userId, title: "E2E CareerGap 이력서", desiredJobTitle: "사회복지사", desiredRegion: "seoul" },
      educations: [],
      experiences: [
        {
          companyName: "한평생물류",
          position: "사무행정 담당",
          startDate: "2015-01-01",
          endDate: "2023-12-31",
          isCurrent: false,
          responsibilities: "사무업무 및 문서작성 처리, 행정업무 지원",
          achievements: "사무처리 정확도 개선",
          orderIndex: 0,
        },
      ],
      qualifications: [],
      trainings: [],
      skills: [],
      items: [],
    });
    console.log(`  ✅ 4. 이력서 생성 — resume_id=${resumeId} (자격/스킬은 이력서에 미기재, 경력만 기재)`);

    // 5. Career DB(user_qualifications/user_skills)에는 실제로 보유 중인 자격/스킬을 반영한다.
    //    -> 사회복지사 2급/컴퓨터 활용/상담은 SATISFIED이지만 이력서에는 없어 Resume Gap이 발생해야 한다.
    await getUserQualificationRepository().upsertFromResume({ userId, name: "사회복지사 2급", sourceResumeId: resumeId });
    await getUserSkillRepository().upsertFromResume({ userId, name: "컴퓨터 활용", sourceResumeId: resumeId });
    await getUserSkillRepository().upsertFromResume({ userId, name: "상담", sourceResumeId: resumeId });
    console.log("  ✅ 5. Career DB 반영 — 사회복지사 2급(자격), 컴퓨터 활용/상담(스킬)");

    // 6. 자기소개서 생성 — "상담" 역량을 언급하지 않아 Cover Letter Gap(스펙 25번)이 발생하게 한다.
    const clTemplates = await getCoverLetterTemplateRepository().findAll({ status: "active" });
    const generalTemplate = clTemplates.find((t) => t.code === "GENERAL");
    if (!generalTemplate) throw new Error("GENERAL Cover Letter Template을 찾을 수 없음");
    const coverLetterDetail = await createCoverLetterFromTemplate({ userId, templateId: generalTemplate.id, title: "E2E CareerGap 자기소개서", resumeId });
    await saveCoverLetterDetail({
      coverLetter: { id: coverLetterDetail.coverLetter.id, userId, title: "E2E CareerGap 자기소개서" },
      sections: coverLetterDetail.sections.map((s, i) => ({
        questionType: s.questionType,
        question: s.question,
        content: i === 0 ? "책임감을 갖고 성실하게 근무하며 맡은 업무를 끝까지 완수하겠습니다." : s.content,
        characterLimit: s.characterLimit,
        orderIndex: s.orderIndex,
      })),
    });
    console.log("  ✅ 6. 자기소개서 생성 — '상담' 관련 표현 없음 (Cover Letter Gap 유도)");

    // 7. 시장 요구조건 통계 수동 재계산 (관리자 "[시장 요구조건 다시 분석]", 스펙 46/47번)
    const requirements = await getCareerRequirementRepository().findAll({ status: "active" });
    assert(requirements.length > 0, "career_requirements 시드가 없음");
    const occSnapshot = await recalculateMarketSnapshot({ occupationId: occupation.id });
    snapshotIds.push(...(occSnapshot.id ? [occSnapshot.id] : []));
    assert(occSnapshot.sampleSize >= testJobIds.length, `직업 단위 표본 수가 테스트 공고 수보다 작음 (sampleSize=${occSnapshot.sampleSize})`);
    assert(occSnapshot.requirements.length === requirements.length, "시장 통계에 모든 Requirement가 포함되지 않음");
    console.log(
      `  ✅ 7. 시장 요구조건 통계(직업 단위) — sampleSize=${occSnapshot.sampleSize}, confidence=${occSnapshot.confidence}, isMockData=${occSnapshot.isMockData}`,
    );

    const destSnapshot = await recalculateMarketSnapshot({ occupationId: occupation.id, destinationId: destination.id });
    snapshotIds.push(...(destSnapshot.id ? [destSnapshot.id] : []));
    assert(destSnapshot.sampleSize <= occSnapshot.sampleSize, "취업처 단위 표본이 직업 단위 표본보다 큼 (부분집합이어야 함)");
    assert(destSnapshot.sampleSize >= homeCareJobsCount, `취업처 단위 표본이 재가복지 테스트 공고 수보다 작음 (sampleSize=${destSnapshot.sampleSize})`);
    console.log(`  ✅ 7-1. 시장 요구조건 통계(취업처 단위) — sampleSize=${destSnapshot.sampleSize} (직업 단위 이하, 부분집합 확인)`);

    const drivingReq = requirements.find((r) => r.key === "driving_available")!;
    const occDrivingStat = occSnapshot.requirements.find((s) => s.requirementId === drivingReq.id)!;
    const destDrivingStat = destSnapshot.requirements.find((s) => s.requirementId === drivingReq.id)!;
    assert(
      destDrivingStat.mentionRate >= occDrivingStat.mentionRate,
      `같은 직업이라도 취업처별로 요구조건 통계가 달라져야 함 (직업 언급률=${occDrivingStat.mentionRate}%, 취업처 언급률=${destDrivingStat.mentionRate}%)`,
    );
    console.log(
      `  ✅ 7-2. 취업처별 통계 차이 확인 — 운전 가능 언급률: 직업단위 ${occDrivingStat.mentionRate}% <= 취업처단위 ${destDrivingStat.mentionRate}%`,
    );

    // job_requirements 표준화 저장 확인 (스펙 7/19번)
    const jobRequirements = await getJobRequirementRepository().findByJobIds(testJobIds);
    assert(jobRequirements.length > 0, "job_requirements에 표준화된 요구조건이 저장되지 않음");
    console.log(`  ✅ 7-3. job_requirements 저장 확인 — ${jobRequirements.length}건`);

    // 8. 직업 단위 Career Gap 분석 실행 (스펙 1/14/15/16/17번)
    const result1 = await runCareerGapAnalysis({ userId, occupationId: occupation.id });
    assert(result1.readinessScore >= 0 && result1.readinessScore <= 100, `readinessScore 범위 오류: ${result1.readinessScore}`);
    console.log(
      `  ✅ 8. 직업 단위 분석 — analysisId=${result1.analysisId}, readinessScore=${result1.readinessScore}, ` +
        `confidence=${result1.confidence}, currentEligibleJobCount=${result1.currentEligibleJobCount}`,
    );

    const drivingItem = result1.improvementItems.find((i) => i.requirementKey === "driving_available");
    assert(drivingItem, "운전 가능 조건이 improvementItems에 없음");
    assert(drivingItem.userStatus === "NOT_SATISFIED", `운전 가능 상태가 NOT_SATISFIED가 아님 (${drivingItem.userStatus})`);
    assert(
      typeof drivingItem.projectedEligibleJobCount === "number" && drivingItem.projectedEligibleJobCount > result1.currentEligibleJobCount,
      `운전 가능 충족 시 지원가능 공고 수가 증가하지 않음 (현재=${result1.currentEligibleJobCount}, 충족 시=${drivingItem.projectedEligibleJobCount})`,
    );
    console.log(
      `  ✅ 8-1. Counterfactual Simulation(운전 가능) — 현재 ${result1.currentEligibleJobCount}건 -> 충족 시 ${drivingItem.projectedEligibleJobCount}건 ` +
        `(+${drivingItem.projectedEligibleJobCount! - result1.currentEligibleJobCount}건)`,
    );

    const qualItem = result1.wellPreparedItems.find((i) => i.requirementKey === "social_worker_level_2");
    assert(qualItem && qualItem.userStatus === "SATISFIED", "사회복지사 2급이 SATISFIED(잘 준비된 항목)로 계산되지 않음");
    const computerItem = result1.wellPreparedItems.find((i) => i.requirementKey === "computer_document");
    assert(computerItem && computerItem.userStatus === "SATISFIED", "컴퓨터 활용이 SATISFIED로 계산되지 않음");
    const adminExpItem = result1.wellPreparedItems.find((i) => i.requirementKey === "administrative_experience");
    assert(adminExpItem && adminExpItem.userStatus === "SATISFIED", "행정·사무업무 경험이 SATISFIED로 계산되지 않음");
    console.log("  ✅ 8-2. 이미 잘 준비된 항목 확인 — 사회복지사 2급 / 컴퓨터 활용 / 행정·사무업무 경험");

    const longTermCareItem = result1.improvementItems.find((i) => i.requirementKey === "long_term_care_experience");
    assert(longTermCareItem && longTermCareItem.userStatus === "CHECK_REQUIRED", "장기요양 실무경험이 CHECK_REQUIRED로 계산되지 않음");
    console.log("  ✅ 8-3. 확인필요 항목 확인 — 장기요양·돌봄 실무경험(CHECK_REQUIRED)");

    assert(result1.resumeGapNotes.length >= 3, `Resume Gap Note가 충분히 생성되지 않음 (${result1.resumeGapNotes.length}건)`);
    const abilityGapKinds = new Set(result1.resumeGapNotes.map((n) => n.kind));
    assert(abilityGapKinds.has("ABILITY_EXISTS_BUT_NOT_EXPRESSED"), "ABILITY_EXISTS_BUT_NOT_EXPRESSED Resume Gap이 없음");
    console.log(`  ✅ 8-4. Resume Gap 확인 — ${result1.resumeGapNotes.length}건 (보유 역량이 이력서에 드러나지 않음)`);

    assert(result1.coverLetterGapNotes.length >= 1, "Cover Letter Gap이 생성되지 않음");
    console.log(`  ✅ 8-5. Cover Letter Gap 확인 — ${result1.coverLetterGapNotes.length}건`);

    assert(result1.recommendations.some((r) => r.kind === "RESUME"), "이력서 보완 추천이 생성되지 않음");
    console.log(`  ✅ 8-6. 추천 확인 — 총 ${result1.recommendations.length}건 (kind별: ${[...new Set(result1.recommendations.map((r) => r.kind))].join(", ")})`);

    assert(result1.multiConditionSimulations.length >= 1, "복수 조건 Simulation이 생성되지 않음");
    console.log(`  ✅ 8-7. 복수 조건 Simulation — ${result1.multiConditionSimulations.length}건 (${result1.multiConditionSimulations.map((s) => s.label).join(" / ")})`);

    assert(Boolean(result1.topPriorityItem), "TOP Priority 항목이 없음");
    console.log(`  ✅ 8-8. 한 가지를 보완한다면(TOP Priority) — ${result1.topPriorityItem?.requirementName}`);

    // 9. 취업처 단위 분석도 정상 동작하는지 확인 (스펙 3번 - 같은 직업, 다른 취업처)
    const result2 = await runCareerGapAnalysis({ userId, occupationId: occupation.id, employmentDestinationId: destination.id });
    assert(result2.destinationName === "재가복지센터", "취업처 단위 분석 결과에 destinationName이 없음");
    assert(result2.marketSampleSize <= result1.marketSampleSize, "취업처 단위 표본이 직업 단위보다 큼");
    console.log(`  ✅ 9. 취업처 단위 분석 — analysisId=${result2.analysisId}, readinessScore=${result2.readinessScore}, sampleSize=${result2.marketSampleSize}`);

    // 10. 결과 재조회(/career-gap/[id] 새로고침, 마이페이지 "결과 다시보기") 확인
    const reloaded = await getCareerGapResult(result1.analysisId);
    assert(reloaded && reloaded.readinessScore === result1.readinessScore, "결과 재조회 시 readinessScore가 일치하지 않음");
    assert(reloaded.wellPreparedItems.length === result1.wellPreparedItems.length, "결과 재조회 시 wellPreparedItems 개수가 일치하지 않음");
    console.log("  ✅ 10. 결과 재조회(getCareerGapResult) 확인 — 저장된 값과 일치");

    // 11. 마이페이지 "취업 준비도" 카드 요약 확인
    const summaries = await listCareerGapSummariesForUser(userId);
    assert(summaries.length === 2, `Career Gap 요약이 2건이 아님 (${summaries.length}건)`);
    assert(summaries.every((s) => typeof s.readinessScore === "number"), "요약에 readinessScore가 없는 항목이 있음");
    console.log(`  ✅ 11. 마이페이지 요약(listCareerGapSummariesForUser) 확인 — ${summaries.length}건`);

    // 12. Admin CRM(getUserCrmDetail) "Career Gap" 섹션 반영 확인
    const crmDetail = await getUserCrmDetail(userId);
    if (!crmDetail) throw new Error("getUserCrmDetail()이 null을 반환함");
    assert(crmDetail.careerGapSummaries.length === 2, "CRM careerGapSummaries가 반영되지 않음");
    console.log(`  ✅ 12. Admin CRM careerGapSummaries 확인 — ${crmDetail.careerGapSummaries.length}건`);

    // 13. Activity Event 반영 확인 (스펙 42번)
    const { data: activityRows } = await admin.from("activity_events").select("event_type").eq("user_id", userId);
    const eventTypes = new Set((activityRows ?? []).map((r) => r.event_type as string));
    for (const required of ["career_gap_analysis_started", "career_gap_analysis_completed"]) {
      if (!eventTypes.has(required)) throw new Error(`activity_events에 ${required}가 기록되지 않음`);
    }
    console.log(`  ✅ 13. activity_events 반영 확인 — ${eventTypes.size}종류 (${[...eventTypes].join(", ")})`);

    // 14. Lead Score 재계산 확인 (스펙 43번 - career_gap_completed 신호)
    const { data: lead } = await admin.from("leads").select("score, grade, score_breakdown").eq("user_id", userId).maybeSingle();
    if (!lead) throw new Error("leads row가 생성되지 않음 (recalculateLeadScore 미동작)");
    const breakdown = (lead.score_breakdown ?? {}) as Record<string, number>;
    assert("career_gap_completed" in breakdown, "Lead Score에 career_gap_completed 신호가 반영되지 않음");
    console.log(`  ✅ 14. Lead 재계산 확인 — score=${lead.score}, grade=${lead.grade}, career_gap_completed=+${breakdown.career_gap_completed}`);

    // 15. market_requirement_snapshots 저장 확인 (스펙 46번)
    const { data: snapshotRows } = await admin
      .from("market_requirement_snapshots")
      .select("id, sample_size, confidence")
      .eq("occupation_id", occupation.id);
    assert((snapshotRows?.length ?? 0) >= 2, "market_requirement_snapshots가 저장되지 않음");
    console.log(`  ✅ 15. market_requirement_snapshots 저장 확인 — ${snapshotRows?.length}건`);

    // 16. RLS 정책 존재 확인 (스펙 52번) — pg_policies는 PostgREST로 노출되지 않으므로 Management API로 확인
    const rlsTables = [
      "employment_destinations",
      "career_requirements",
      "job_requirements",
      "market_requirement_snapshots",
      "career_gap_analyses",
      "career_gap_items",
      "user_employment_destination_interests",
    ];
    const rlsResult = await runReadOnlyQuery(
      `select tablename, count(*) as policy_count from pg_policies where schemaname = 'public' and tablename in (${rlsTables
        .map((t) => `'${t}'`)
        .join(",")}) group by tablename order by tablename;`,
    );
    if (!rlsResult.ok) throw new Error(`RLS 정책 조회 실패: ${JSON.stringify(rlsResult.error)}`);
    const rlsRows = rlsResult.rows as Array<{ tablename: string; policy_count: string }>;
    console.log(`  ✅ 16. RLS 정책 확인 — ${rlsRows.map((r) => `${r.tablename}=${r.policy_count}건`).join(", ")}`);
    for (const table of rlsTables) {
      const row = rlsRows.find((r) => r.tablename === table);
      if (!row || Number(row.policy_count) === 0) throw new Error(`${table} 테이블에 RLS 정책이 없음`);
    }

    console.log(
      `\n모든 STEP 7.5 Career Gap Engine Flow 단계가 정상적으로 통과했습니다. ` +
        `(직업단위 준비도=${result1.readinessScore}점, 취업처단위 준비도=${result2.readinessScore}점)`,
    );
  } finally {
    console.log("\n🧹 테스트 데이터 정리 중...");
    try {
      for (const snapshotId of snapshotIds) {
        await admin.from("market_requirement_snapshots").delete().eq("id", snapshotId);
      }
      if (testJobIds.length > 0) {
        await admin.from("job_requirements").delete().in("job_id", testJobIds);
        await admin.from("jobs").delete().in("id", testJobIds);
      }
      if (userId) {
        await admin.from("career_gap_analyses").delete().eq("user_id", userId);
        await admin.from("user_employment_destination_interests").delete().eq("user_id", userId);
        await admin.from("cover_letters").delete().eq("user_id", userId);
        await admin.from("resumes").delete().eq("user_id", userId);
        await admin.from("user_qualifications").delete().eq("user_id", userId);
        await admin.from("user_skills").delete().eq("user_id", userId);
        await admin.from("activity_events").delete().eq("user_id", userId);
        await admin.from("leads").delete().eq("user_id", userId);
        await admin.from("career_profiles").delete().eq("user_id", userId);
        await admin.from("profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
      }
    } catch (cleanupErr) {
      console.warn("정리 중 일부 실패(무시 가능):", cleanupErr);
    }
    console.log("   완료.\n");
  }
}

main().catch((err) => {
  console.error("\n❌ E2E Career Gap Engine Flow 검증 실패:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
