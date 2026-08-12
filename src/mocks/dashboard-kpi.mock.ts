export interface DashboardKpi {
  key: string;
  label: string;
  value: string;
  changeLabel?: string;
  changeDirection?: "up" | "down" | "flat";
}

/** 관리자 대시보드 상단 KPI Mock 데이터. 배열 기반이라 카드 추가/삭제가 쉽다. */
export const mockDashboardKpis: DashboardKpi[] = [
  { key: "total_members", label: "전체 회원", value: "12,486명", changeLabel: "+128 (최근 7일)", changeDirection: "up" },
  { key: "new_leads", label: "신규 DB", value: "347명", changeLabel: "+42 (최근 7일)", changeDirection: "up" },
  { key: "active_job_seekers", label: "활성 구직자", value: "3,912명", changeLabel: "+3.2%", changeDirection: "up" },
  { key: "needs_consulting", label: "상담 필요 회원", value: "214명", changeLabel: "+18명", changeDirection: "up" },
  { key: "grade_a_leads", label: "A등급 Lead", value: "58명", changeLabel: "+6명", changeDirection: "up" },
  { key: "assessment_completed", label: "검사 완료", value: "1,204건", changeLabel: "+96건", changeDirection: "up" },
  { key: "job_views", label: "채용공고 조회", value: "28,930회", changeLabel: "+4.1%", changeDirection: "up" },
  { key: "support_views", label: "지원금 조회", value: "9,102회", changeLabel: "-1.4%", changeDirection: "down" },
];
