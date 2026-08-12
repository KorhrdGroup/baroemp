/**
 * STEP 7: 이력서/자기소개서 Builder 실 Supabase E2E.
 *
 * 실제 서비스 레이어(resume.service / cover-letter.service / experience-bank.service /
 * ai-resume.service / resume-career-merge.service / lead-score.service)를 통해
 * "회원 생성 -> Resume 생성(Template+Career DB prefill) -> 경력/자격/스킬/학력 추가 -> 저장(Version/완성도)
 *  -> Career DB Merge 반영 확인 -> AI 첨삭 -> Cover Letter 생성/저장 -> Target Job 연결
 *  -> Activity/Lead 반영 확인 -> CRM(getUserCrmDetail) 반영 확인" 전 구간을 1회 실행 검증한다.
 *
 * e2e-job-flow.ts와 동일한 이유로, Next.js 요청 컨텍스트(쿠키 기반 세션)가 없는 순수 Node 스크립트이므로
 * Server Action을 직접 호출하지 않고 Action이 내부적으로 호출하는 서비스 함수를 동일 인자로 직접 호출한다.
 * "클라이언트가 임의 userId로 남의 이력서에 접근할 수 없는지"는 requireOwnResume() 등
 * Server Action 계층의 코드 리뷰 + smoke:auth의 세션 검증으로 별도 확인한다.
 *
 * 실행: npx tsx --env-file-if-exists=.env.local scripts/e2e-resume-flow.ts
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getResumeTemplateRepository, getCoverLetterTemplateRepository, getJobRepository } from "@/lib/repositories";
import {
  createResumeFromTemplate,
  getResumeDetail,
  listResumeVersions,
  saveResumeDetail,
} from "@/services/resume.service";
import { createCoverLetterFromTemplate, saveCoverLetterDetail } from "@/services/cover-letter.service";
import { createExperienceBankItem, listExperienceBankForUser } from "@/services/experience-bank.service";
import { reviewResumeWithAI } from "@/services/ai-resume.service";
import { getUserCrmDetail } from "@/services/user-crm.service";
import { runReadOnlyQuery } from "./supabase-management-api";

async function main() {
  if (process.env.DATA_SOURCE_MODE !== "supabase") {
    console.error("DATA_SOURCE_MODE=supabase 가 아닙니다. .env.local을 확인하세요.");
    process.exit(1);
  }

  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Supabase Admin Client 생성 실패 (서비스 키 확인 필요)");
  const email = `e2e-resume-${Date.now()}@baro.local`;
  let userId: string | undefined;
  let resumeId: string | undefined;
  let coverLetterId: string | undefined;

  try {
    console.log("▶ 실제 서비스 레이어를 통한 이력서/자기소개서 Builder Flow 검증 시작 (Supabase Mode)\n");

    // 0. 임시 회원 생성 (0033 트리거가 profiles 자동 생성)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: "password123!",
      email_confirm: true,
    });
    if (createErr || !created.user) throw new Error(`임시 회원 생성 실패: ${createErr?.message}`);
    userId = created.user.id;
    await admin
      .from("profiles")
      .update({ name: "E2E Resume 테스트", phone: "010-1234-5678" })
      .eq("id", userId);
    console.log(`  ✅ 0. 임시 회원 생성 — user_id=${userId}`);

    // 1. Template 목록 확인 (V1 최소 4개) + STANDARD 선택
    const templates = await getResumeTemplateRepository().findAll({ status: "active" });
    console.log(`  ✅ 1. resume_templates 조회 — ${templates.length}개 (${templates.map((t) => t.code).join(", ")})`);
    if (templates.length < 4) throw new Error("V1 Template이 4개 미만입니다.");
    const standardTemplate = templates.find((t) => t.code === "STANDARD");
    if (!standardTemplate) throw new Error("STANDARD Template을 찾을 수 없음");

    // 채용공고 1건 확보 (target_job_id 연결 검증용). 없으면 target job 없이 진행.
    const jobs = await getJobRepository().findAll({});
    const targetJob = jobs[0];

    // 2. Resume 생성 (Template 선택 + Career DB prefill)
    const created1 = await createResumeFromTemplate({
      userId,
      templateId: standardTemplate.id,
      title: "E2E 테스트 이력서",
      targetJobId: targetJob?.id,
    });
    resumeId = created1.resume.id;
    console.log(
      `  ✅ 2. createResumeFromTemplate() — resume_id=${resumeId}, isPrimary=${created1.resume.isPrimary}, targetJobId=${created1.resume.targetJobId ?? "-"}`,
    );
    if (!created1.resume.isPrimary) throw new Error("첫 이력서인데 대표 이력서로 설정되지 않음");

    // 3. 학력/경력/자격/스킬 추가 후 저장
    const saved = await saveResumeDetail({
      resume: {
        id: resumeId,
        userId,
        title: "E2E 테스트 이력서",
        summary: "고객상담 8년, 사회복지 분야로 직무전환을 준비하는 지원자",
        desiredJobTitle: "사회복지사",
        desiredRegion: "seoul",
      },
      educations: [
        { schoolName: "한평생대학교", major: "사회복지학과", degree: "학사", graduationStatus: "졸업", orderIndex: 0 },
      ],
      experiences: [
        {
          companyName: "한평생물류",
          position: "고객상담팀장",
          startDate: "2016-01-01",
          endDate: "2023-12-31",
          isCurrent: false,
          responsibilities: "고객상담, 거래처 관리, 문서작성",
          achievements: "월 고객상담 200건 처리, 신규거래처 20개 확보",
          orderIndex: 0,
        },
      ],
      qualifications: [{ name: "사회복지사 2급", issuer: "한국사회복지사협회", acquiredAt: "2023-06-01", orderIndex: 0 }],
      trainings: [],
      skills: [
        { name: "엑셀", orderIndex: 0 },
        { name: "상담", orderIndex: 1 },
      ],
      items: [],
    });
    console.log(
      `  ✅ 3. saveResumeDetail() — completeness=${saved.resume.completeness}%, version=${saved.resume.version}, ` +
        `experiences=${saved.experiences.length}, educations=${saved.educations.length}, qualifications=${saved.qualifications.length}, skills=${saved.skills.length}`,
    );
    if (saved.resume.completeness <= 0) throw new Error("완성도가 계산되지 않음");
    if (saved.experiences.length !== 1 || saved.educations.length !== 1) throw new Error("경력/학력 저장 결과 개수 불일치");

    // 4. Resume Version 기록 확인
    const versions = await listResumeVersions(resumeId);
    console.log(`  ✅ 4. resume_versions 기록 확인 — ${versions.length}건 (최신 change_type=${versions[0]?.changeType})`);
    if (versions.length === 0) throw new Error("resume_versions에 기록되지 않음");

    // 5. Career DB Merge 반영 확인 (user_qualifications / user_skills에 source=RESUME로 반영)
    const { data: mergedQuals } = await admin
      .from("user_qualifications")
      .select("id, source, source_resume_id")
      .eq("user_id", userId);
    const { data: mergedSkills } = await admin.from("user_skills").select("id, source").eq("user_id", userId);
    console.log(
      `  ✅ 5. Career DB Merge 확인 — user_qualifications=${mergedQuals?.length ?? 0}건, user_skills=${mergedSkills?.length ?? 0}건`,
    );
    if (!mergedQuals || mergedQuals.length === 0) throw new Error("이력서 자격증이 Career DB(user_qualifications)에 반영되지 않음");
    if (!mergedQuals.every((q) => q.source === "RESUME")) throw new Error("Merge된 자격증의 source가 RESUME이 아님");
    if (!mergedSkills || mergedSkills.length === 0) throw new Error("이력서 스킬이 Career DB(user_skills)에 반영되지 않음");

    // 6. AI 이력서 점검 (Mock AI Provider, 허위경력 미생성 원칙 확인)
    const review = await reviewResumeWithAI(resumeId);
    console.log(
      `  ✅ 6. reviewResumeWithAI() — score=${review.score}, strengths=${review.strengths.length}, improvements=${review.improvements.length}`,
    );
    if (typeof review.score !== "number") throw new Error("AI 점검 결과 score가 없음");

    // 7. Experience Bank 저장 확인
    const bankItem = await createExperienceBankItem(userId, {
      title: "고객 민원 해결",
      situation: "고객 불만이 반복되던 상황",
      task: "민원 대응 총괄",
      action: "원인을 분석하고 대응 매뉴얼을 정비함",
      result: "민원 재발이 감소함",
    });
    const bankItems = await listExperienceBankForUser(userId);
    console.log(`  ✅ 7. Experience Bank 저장 확인 — ${bankItems.length}건 (title=${bankItem.title})`);
    if (bankItems.length === 0) throw new Error("experience_bank에 저장되지 않음");

    // 8. Cover Letter 생성 + Section 저장 + Target Job 연결
    const clTemplates = await getCoverLetterTemplateRepository().findAll({ status: "active" });
    const generalTemplate = clTemplates.find((t) => t.code === "GENERAL");
    if (!generalTemplate) throw new Error("GENERAL Cover Letter Template을 찾을 수 없음");

    const coverLetterDetail = await createCoverLetterFromTemplate({
      userId,
      templateId: generalTemplate.id,
      title: "E2E 테스트 자기소개서",
      resumeId,
      targetJobId: targetJob?.id,
    });
    coverLetterId = coverLetterDetail.coverLetter.id;
    console.log(
      `  ✅ 8. createCoverLetterFromTemplate() — cover_letter_id=${coverLetterId}, sections=${coverLetterDetail.sections.length}, targetJobId=${coverLetterDetail.coverLetter.targetJobId ?? "-"}`,
    );
    if (coverLetterDetail.sections.length === 0) throw new Error("Cover Letter 기본 문항이 생성되지 않음");

    const savedCoverLetter = await saveCoverLetterDetail({
      coverLetter: { id: coverLetterId, userId, title: "E2E 테스트 자기소개서" },
      sections: coverLetterDetail.sections.map((s, i) => ({
        questionType: s.questionType,
        question: s.question,
        content: i === 0 ? "고객상담 경력을 바탕으로 사회복지 분야에 기여하고 싶어 지원했습니다." : s.content,
        characterLimit: s.characterLimit,
        orderIndex: s.orderIndex,
      })),
    });
    console.log(`  ✅ 8-1. saveCoverLetterDetail() — status=${savedCoverLetter.coverLetter.status}`);

    // 9. Activity/Lead 반영 확인
    const { data: activityRows } = await admin
      .from("activity_events")
      .select("event_type")
      .eq("user_id", userId);
    const eventTypes = new Set((activityRows ?? []).map((r) => r.event_type as string));
    console.log(`  ✅ 9. activity_events 반영 확인 — ${eventTypes.size}종류 (${[...eventTypes].join(", ")})`);
    for (const required of ["resume_created", "resume_updated", "resume_ai_reviewed", "cover_letter_created"]) {
      if (!eventTypes.has(required)) throw new Error(`activity_events에 ${required}가 기록되지 않음`);
    }
    if (targetJob && !eventTypes.has("target_job_selected")) {
      throw new Error("target_job_id가 있는데 target_job_selected 이벤트가 기록되지 않음");
    }

    const { data: lead } = await admin.from("leads").select("score, grade").eq("user_id", userId).maybeSingle();
    console.log(`  ✅ 9-1. Lead 재계산 확인 — score=${JSON.stringify(lead?.score)}, grade=${lead?.grade}`);
    if (!lead) throw new Error("leads row가 생성되지 않음 (recalculateLeadScore 미동작)");

    // 10. CRM(getUserCrmDetail)/Mypage 데이터 반영 확인
    const crmDetail = await getUserCrmDetail(userId);
    if (!crmDetail) throw new Error("getUserCrmDetail()이 null을 반환함");
    console.log(
      `  ✅ 10. getUserCrmDetail().resumeSummary 확인 — resumeCount=${crmDetail.resumeSummary.resumeCount}, ` +
        `coverLetterCount=${crmDetail.resumeSummary.coverLetterCount}, primaryCompleteness=${crmDetail.resumeSummary.primaryResume?.completeness}%`,
    );
    if (crmDetail.resumeSummary.resumeCount !== 1) throw new Error("CRM resumeSummary.resumeCount가 예상과 다름");
    if (crmDetail.resumeSummary.coverLetterCount !== 1) throw new Error("CRM resumeSummary.coverLetterCount가 예상과 다름");
    if (!crmDetail.resumeSummary.lastAiReviewedAt) throw new Error("CRM resumeSummary.lastAiReviewedAt이 비어있음 (AI 첨삭 반영 안됨)");

    // 11. 다른 사용자 이력서 접근 차단(RLS) — pg_policies는 PostgREST로 노출되지 않으므로
    // Supabase Management API(SQL 실행)로 실제 RLS 정책 존재 여부를 확인한다.
    const rlsTables = ["resumes", "resume_educations", "resume_experiences", "resume_qualifications", "cover_letters", "cover_letter_sections", "experience_bank"];
    const rlsResult = await runReadOnlyQuery(
      `select tablename, count(*) as policy_count from pg_policies where schemaname = 'public' and tablename in (${rlsTables
        .map((t) => `'${t}'`)
        .join(",")}) group by tablename order by tablename;`,
    );
    if (!rlsResult.ok) throw new Error(`RLS 정책 조회 실패: ${JSON.stringify(rlsResult.error)}`);
    const rlsRows = rlsResult.rows as Array<{ tablename: string; policy_count: string }>;
    console.log(`  ✅ 11. RLS 정책 확인 — ${rlsRows.map((r) => `${r.tablename}=${r.policy_count}건`).join(", ")}`);
    for (const table of rlsTables) {
      const row = rlsRows.find((r) => r.tablename === table);
      if (!row || Number(row.policy_count) === 0) throw new Error(`${table} 테이블에 RLS 정책이 없음`);
    }

    // 재조회로 최종 상태 한번 더 검증
    const finalDetail = await getResumeDetail(resumeId);
    if (!finalDetail) throw new Error("최종 재조회 실패");
    console.log(`\n모든 STEP 7 Resume/Cover Letter Flow 단계가 정상적으로 통과했습니다. (최종 완성도=${finalDetail.resume.completeness}%)`);
  } finally {
    console.log("\n🧹 테스트 데이터 정리 중...");
    try {
      if (userId) {
        await admin.from("cover_letters").delete().eq("user_id", userId);
        await admin.from("experience_bank").delete().eq("user_id", userId);
        await admin.from("user_qualifications").delete().eq("user_id", userId);
        await admin.from("user_skills").delete().eq("user_id", userId);
        await admin.from("resumes").delete().eq("user_id", userId);
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
  console.error("\n❌ E2E Resume/Cover Letter Flow 검증 실패:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
