import type { AgeGroup, ISODateString, PublishStatus, Region, Tag } from "./common";
import type { ContentRecommendationRuleRow } from "./recommendation-rule";

/**
 * Content Catalog: 회사가 보유한 모든 콘텐츠/상품/서비스를 표현하는 도메인.
 *
 * 절대 특정 자격증/직업에 종속되지 않도록 설계한다.
 * 관리자가 새로운 콘텐츠를 등록하면 코드 수정 없이 추천 대상/노출 대상에 포함될 수 있어야 한다.
 */
export type ContentType =
  | "LICENSE"
  | "PRIVATE_CERTIFICATE"
  | "JOB_TRAINING"
  | "ONLINE_COURSE"
  | "CONSULTING"
  | "ASSESSMENT"
  | "FREE_CONTENT"
  | "SEMINAR"
  | "SUPPORT_PROGRAM"
  | "OTHER";

/**
 * 추천 규칙: Matching Engine이 참조하는 조건 세트.
 * 조건은 전부 optional이며, 관리자가 값을 지정한 항목만 매칭 시 평가한다.
 * 새로운 조건이 필요하면 이 타입에 필드를 추가하면 되고,
 * Matching Engine 코드를 새로 작성할 필요는 없도록 evaluate 함수는 존재하는 필드만 순회한다.
 */
export interface ContentRecommendationRule {
  targetAgeGroups?: AgeGroup[];
  targetRegions?: Region[];
  targetJobCategories?: string[];
  /** 관련 태그가 하나라도 겹치면 가중치를 부여 */
  matchTags?: Tag[];
  /** 특정 자격을 보유하지 않은 사람에게만 추천하고 싶을 때 사용 */
  excludeIfHeldQualificationIds?: string[];
  /** 경력단절 기간이 이 값(개월) 이상인 사용자에게 우선 추천 */
  minCareerBreakMonths?: number;
  /** 가중치 (기본 1). 관리자가 콘텐츠별 노출 우선도를 조정할 때 사용 */
  weight?: number;
}

export interface CareerContent {
  id: string;
  title: string;
  type: ContentType | (string & {});
  description: string;
  /** 카드/목록에서 보여줄 짧은 요약 */
  summary?: string;
  shortDescription?: string;
  slug?: string;
  category?: string;

  tags: Tag[];
  /** 연관 직업(Job.id) - 있으면 직업 상세/추천에서 함께 노출 */
  relatedJobs: string[];

  targetAgeGroups: AgeGroup[];
  /** 대상 조건 - 자유 서술형(예: "경력단절 3년 이상", "운전 가능자") */
  targetConditions: string[];
  /** 이수 시 취득/요구되는 자격 (Content.id 자기참조 가능) */
  requiredQualifications: string[];

  /** 레거시 객체형 규칙 (하위호환) */
  recommendationRules: ContentRecommendationRule;
  /** DB content_recommendation_rules 행 — 관리자 설정형 규칙 */
  recommendationRuleRows?: ContentRecommendationRuleRow[];

  price: number;
  isPaid: boolean;
  status: PublishStatus;

  /** 콘텐츠 제공기관/파트너 - 없으면 자체 서비스 */
  provider?: string;
  /** 콘텐츠 대표 이미지 경로. 없으면 UI에서 CSS 플레이스홀더 사용 */
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type CareerContentInput = Partial<
  Omit<CareerContent, "id" | "createdAt" | "updatedAt">
> & {
  title: string;
  type: ContentType;
};
