import type {
  AgeGroup,
  DesiredStartTiming,
  EducationLevel,
  EmploymentStatus,
  ISODateString,
  Region,
  Tag,
  WorkType,
} from "./common";

/**
 * Career Profile: 사용자의 취업 관련 정보를 담는 핵심 도메인.
 *
 * 이 서비스의 가장 중요한 자산인 "Career DB"의 기본 단위다.
 * 무료 서비스를 이용하는 과정에서 점진적으로 채워지며,
 * 이 프로필을 기반으로 Matching Engine이 직업/콘텐츠/채용/지원금을 추천한다.
 *
 * 특정 자격/직업에 종속되지 않도록 모든 관심사 필드는
 * id 참조(string[]) 또는 자유 태그(Tag[]) 형태로 설계한다.
 */
export interface CareerProfile {
  id: string;
  userId: string;

  ageGroup?: AgeGroup;
  region?: Region;
  educationLevel?: EducationLevel;

  /** 총 경력 연수 (개월 단위 환산 가능) */
  careerYears?: number;
  /** 경력단절 기간(개월). 값이 있으면 경력단절 상태로 간주. */
  careerBreakMonths?: number;

  employmentStatus?: EmploymentStatus;

  /** 희망 직종 - Job/Content의 jobCategory와 매칭되는 코드 배열 */
  desiredJobCategories?: string[];
  /** 관심 직업 - Job.id 참조 */
  interestedJobIds?: string[];

  desiredSalaryMin?: number;
  desiredSalaryMax?: number;

  desiredWorkTypes?: WorkType[];
  desiredStartTiming?: DesiredStartTiming;

  canDrive?: boolean;

  /** 보유 자격 - Content.id(자격 유형) 또는 자유 문자열 코드 */
  heldQualifications?: string[];
  /** 관심 자격 - Content.id 참조 */
  interestedQualifications?: string[];

  /** 교육/과정 참여 의향 */
  isOpenToTraining?: boolean;

  /** 취업 장벽 요인 (건강, 이동거리, 경력단절 등) - 자유 태그 */
  employmentBarriers?: Tag[];

  /** 관심 태그 - 직업/콘텐츠 매칭에 폭넓게 활용되는 자유 태그 */
  interestTags?: Tag[];

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Career Profile 생성/수정 시 사용하는 부분 입력 타입. */
export type CareerProfileInput = Partial<
  Omit<CareerProfile, "id" | "userId" | "createdAt" | "updatedAt">
>;
