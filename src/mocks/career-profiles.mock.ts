import type { AgeGroup, CareerProfile, EmploymentStatus, Region } from "@/types";
import { mockAdminUsers } from "./users.mock";

const ageMap: Record<string, AgeGroup> = {
  "30대": "30s",
  "40대": "40s",
  "50대": "50s",
  "60대": "60s",
  "70대+": "70plus",
};

const regionMap: Record<string, Region> = {
  서울: "seoul",
  부산: "busan",
  경기: "gyeonggi",
  인천: "incheon",
  대전: "daejeon",
  경남: "gyeongnam",
  광주: "gwangju",
  대구: "daegu",
  울산: "ulsan",
  전북: "jeonbuk",
  충남: "chungnam",
  세종: "sejong",
  제주: "jeju",
  강원: "gangwon",
  경북: "gyeongbuk",
  전남: "jeonnam",
  충북: "chungbuk",
};

const empMap: Record<string, EmploymentStatus> = {
  경력단절: "career_break",
  미취업: "unemployed",
  재직중: "employed",
  은퇴준비: "preparing_retirement",
};

const categories = ["care_worker", "social_worker", "office_admin", "delivery_driver", "facility_management", "hospital_companion"];
const timings = ["immediately", "within_1_month", "within_3_months", "within_6_months", "undecided"] as const;

/** STEP 2: 회원 20명 Career Profile */
export const mockCareerProfiles: CareerProfile[] = mockAdminUsers.map((user, i) => {
  const ageGroup = ageMap[user.ageGroup] ?? "50s";
  const region = regionMap[user.region] ?? "seoul";
  const employmentStatus = empMap[user.employmentStatus] ?? "unemployed";
  const cat = categories[i % categories.length];

  return {
    id: `profile-${user.id.replace("user-", "")}`,
    userId: user.id,
    ageGroup,
    region,
    educationLevel: i % 2 === 0 ? "high_school" : "university_4y",
    careerYears: 8 + (i % 20),
    careerBreakMonths: employmentStatus === "career_break" ? 6 + (i % 10) : 0,
    employmentStatus,
    desiredJobCategories: [cat],
    interestedJobIds: [`job-00${(i % 6) + 1}`],
    desiredSalaryMin: 2200 + i * 20,
    desiredSalaryMax: 2800 + i * 20,
    desiredWorkTypes: ["full_time"],
    desiredStartTiming: timings[i % timings.length],
    canDrive: i % 2 === 0,
    heldQualifications: i % 5 === 0 ? ["컴퓨터활용능력 2급"] : [],
    interestedQualifications:
      cat === "care_worker"
        ? ["요양보호사"]
        : cat === "social_worker"
          ? ["사회복지사 2급"]
          : ["관련 자격"],
    isOpenToTraining: true,
    employmentBarriers: employmentStatus === "career_break" ? ["경력단절"] : [],
    interestTags:
      cat === "care_worker" || cat === "hospital_companion"
        ? ["돌봄", "노인", "재취업"]
        : cat === "social_worker"
          ? ["복지", "상담"]
          : ["사무", "교육의향"],
    createdAt: `${user.joinedAt}T00:00:00.000Z`,
    updatedAt: "2026-08-10T00:00:00.000Z",
  };
});
