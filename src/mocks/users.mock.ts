import type { AdminUserListItem } from "@/types";

export type AdminUserRow = AdminUserListItem;

/** STEP 2: 회원 20명 Seed (Mock Mode) */
export const mockAdminUsers: AdminUserListItem[] = [
  { id: "user-1001", name: "김미영", email: "miyoung.kim@example.com", phone: "010-1234-5678", ageGroup: "50대", region: "서울", employmentStatus: "경력단절", signupChannel: "google", joinedAt: "2026-07-01", leadGrade: "A", leadScore: 85 },
  { id: "user-1002", name: "박정호", email: "jungho.park@example.com", phone: "010-2345-6789", ageGroup: "60대", region: "부산", employmentStatus: "미취업", signupChannel: "kakao", joinedAt: "2026-07-05", leadGrade: "B", leadScore: 45 },
  { id: "user-1003", name: "이수진", email: "sujin.lee@example.com", phone: "010-3456-7890", ageGroup: "40대", region: "경기", employmentStatus: "미취업", signupChannel: "naver", joinedAt: "2026-07-08", leadGrade: "B", leadScore: 50 },
  { id: "user-1004", name: "최영수", email: "youngsu.choi@example.com", phone: "010-4567-8901", ageGroup: "50대", region: "인천", employmentStatus: "미취업", signupChannel: "homepage", joinedAt: "2026-07-12", leadGrade: "A", leadScore: 75 },
  { id: "user-1005", name: "한은지", email: "eunji.han@example.com", phone: "010-5678-9012", ageGroup: "30대", region: "대전", employmentStatus: "재직중", signupChannel: "google", joinedAt: "2026-07-15", leadGrade: "C", leadScore: 25 },
  { id: "user-1006", name: "장현우", email: "hyunwoo.jang@example.com", phone: "010-6789-0123", ageGroup: "60대", region: "경남", employmentStatus: "은퇴준비", signupChannel: "homepage", joinedAt: "2026-08-01", leadGrade: "B", leadScore: 40 },
  { id: "user-1007", name: "윤서아", email: "seoa.yoon@example.com", phone: "010-7890-1234", ageGroup: "40대", region: "서울", employmentStatus: "미취업", signupChannel: "kakao", joinedAt: "2026-06-01", leadGrade: "D", leadScore: 10 },
  { id: "user-1008", name: "정민교", email: "mingyo.jung@example.com", phone: "010-8901-2345", ageGroup: "50대", region: "광주", employmentStatus: "미취업", signupChannel: "homepage", joinedAt: "2026-07-30", leadGrade: "A", leadScore: 65 },
  { id: "user-1009", name: "오세린", email: "serin.oh@example.com", phone: "010-9012-3456", ageGroup: "50대", region: "대구", employmentStatus: "경력단절", signupChannel: "facebook", joinedAt: "2026-07-18", leadGrade: "B", leadScore: 55 },
  { id: "user-1010", name: "강태훈", email: "taehoon.kang@example.com", phone: "010-0123-4567", ageGroup: "40대", region: "울산", employmentStatus: "미취업", signupChannel: "naver", joinedAt: "2026-07-20", leadGrade: "C", leadScore: 30 },
  { id: "user-1011", name: "배수아", email: "sua.bae@example.com", phone: "010-1111-2222", ageGroup: "60대", region: "전북", employmentStatus: "미취업", signupChannel: "homepage", joinedAt: "2026-07-22", leadGrade: "B", leadScore: 42 },
  { id: "user-1012", name: "신동욱", email: "dongwook.shin@example.com", phone: "010-2222-3333", ageGroup: "50대", region: "충남", employmentStatus: "경력단절", signupChannel: "kakao", joinedAt: "2026-07-24", leadGrade: "A", leadScore: 70 },
  { id: "user-1013", name: "문지혜", email: "jihye.moon@example.com", phone: "010-3333-4444", ageGroup: "40대", region: "세종", employmentStatus: "미취업", signupChannel: "google", joinedAt: "2026-07-25", leadGrade: "C", leadScore: 28 },
  { id: "user-1014", name: "홍기철", email: "gicheol.hong@example.com", phone: "010-4444-5555", ageGroup: "70대+", region: "제주", employmentStatus: "은퇴준비", signupChannel: "homepage", joinedAt: "2026-07-26", leadGrade: "D", leadScore: 15 },
  { id: "user-1015", name: "송예린", email: "yerin.song@example.com", phone: "010-5555-6666", ageGroup: "50대", region: "강원", employmentStatus: "미취업", signupChannel: "naver", joinedAt: "2026-07-27", leadGrade: "B", leadScore: 48 },
  { id: "user-1016", name: "임재호", email: "jaeho.lim@example.com", phone: "010-6666-7777", ageGroup: "40대", region: "경북", employmentStatus: "재직중", signupChannel: "facebook", joinedAt: "2026-07-28", leadGrade: "C", leadScore: 22 },
  { id: "user-1017", name: "노은정", email: "eunjung.noh@example.com", phone: "010-7777-8888", ageGroup: "50대", region: "전남", employmentStatus: "경력단절", signupChannel: "homepage", joinedAt: "2026-07-29", leadGrade: "A", leadScore: 80 },
  { id: "user-1018", name: "유성민", email: "sungmin.yoo@example.com", phone: "010-8888-9999", ageGroup: "60대", region: "충북", employmentStatus: "미취업", signupChannel: "kakao", joinedAt: "2026-07-31", leadGrade: "B", leadScore: 44 },
  { id: "user-1019", name: "하윤서", email: "yunseo.ha@example.com", phone: "010-9999-0000", ageGroup: "40대", region: "서울", employmentStatus: "미취업", signupChannel: "google", joinedAt: "2026-08-02", leadGrade: "B", leadScore: 52 },
  { id: "user-1020", name: "조병관", email: "byungkwan.jo@example.com", phone: "010-1010-2020", ageGroup: "50대", region: "부산", employmentStatus: "경력단절", signupChannel: "homepage", joinedAt: "2026-08-03", leadGrade: "A", leadScore: 68 },
];

