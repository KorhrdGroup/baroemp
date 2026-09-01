import type { AssessmentQuestion, CareerProfile } from "@/types";
import type { AnswerValue } from "./question-renderer";

/**
 * 취업 프로필에 이미 있는 정보를 진단 문항의 답으로 미리 채운다.
 *
 * 예전에는 이런 문항을 아예 건너뛰었는데(question-skipper), 무엇이 어떻게 반영됐는지
 * 보이지 않아 "왜 문항이 줄었지"만 남았다. 채워진 상태로 보여주면 확인·수정이 그 자리에서
 * 되고, 다음을 누르는 순간 답변으로도 저장되어 결과 계산이 프로필 병합에 기대지 않는다.
 *
 * 값이 깔끔하게 되돌아가는 필드만 채운다. isOpenToTraining처럼 프로필에는 불리언으로
 * 뭉개져 저장되는 값(SCALE 1~5 → ≥4)은 원래 답을 복원할 수 없으므로 그냥 다시 묻는다.
 * canDrive는 저장소가 미응답을 false로 뭉개 "아니오"를 잘못 채울 수 있어 제외한다.
 */
export function buildPrefilledAnswers(
  questions: AssessmentQuestion[],
  profile: CareerProfile | null | undefined,
  heldQualificationNames: string[] = [],
): Record<string, AnswerValue> {
  if (!profile) return {};

  const prefilled: Record<string, AnswerValue> = {};

  const findOptionByProfileValue = (question: AssessmentQuestion, value: unknown) =>
    question.options?.find((o) => o.profileValue === value);

  for (const question of questions) {
    switch (question.profileField) {
      case "ageGroup":
      case "employmentStatus":
      case "desiredStartTiming": {
        const value =
          question.profileField === "ageGroup"
            ? profile.ageGroup
            : question.profileField === "employmentStatus"
              ? profile.employmentStatus
              : profile.desiredStartTiming;
        const option = value !== undefined && value !== null ? findOptionByProfileValue(question, value) : undefined;
        if (option) prefilled[question.id] = { type: "SINGLE", optionId: option.id };
        break;
      }
      case "desiredWorkTypes": {
        // 진단의 근무형태 문항은 단일 선택이라 프로필의 첫 값으로 채운다.
        const option = profile.desiredWorkTypes?.length
          ? findOptionByProfileValue(question, profile.desiredWorkTypes[0])
          : undefined;
        if (option) prefilled[question.id] = { type: "SINGLE", optionId: option.id };
        break;
      }
      case "region": {
        if (profile.region) prefilled[question.id] = { type: "REGION", sido: profile.region };
        break;
      }
      case "desiredSalaryRange": {
        if (profile.desiredSalaryMin !== undefined || profile.desiredSalaryMax !== undefined) {
          prefilled[question.id] = {
            type: "SALARY_RANGE",
            min: profile.desiredSalaryMin,
            max: profile.desiredSalaryMax,
          };
        }
        break;
      }
      case "careerYears":
      case "careerBreakMonths": {
        const value = question.profileField === "careerYears" ? profile.careerYears : profile.careerBreakMonths;
        if (typeof value === "number") prefilled[question.id] = { type: "NUMBER", value };
        break;
      }
      case "heldQualifications": {
        // 자격은 career_profiles가 아니라 user_qualifications(Career DB)가 원본이다.
        if (heldQualificationNames.length === 0) break;
        const optionIds = (question.options ?? [])
          .filter((o) => {
            const candidates = [o.profileValue, o.optionText].filter((v): v is string => typeof v === "string");
            return candidates.some((name) =>
              heldQualificationNames.some((held) => held === name || held.includes(name) || name.includes(held)),
            );
          })
          .map((o) => o.id);
        if (optionIds.length > 0) prefilled[question.id] = { type: "MULTI", optionIds };
        break;
      }
      default:
        break;
    }
  }

  return prefilled;
}
