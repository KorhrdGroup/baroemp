import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { throwDataSourceError } from "@/lib/data/errors";
import { isSupabaseMode } from "@/lib/data/mode";
import { mockAdminUsers } from "@/mocks/users.mock";
import { getLeadRepository } from "@/lib/repositories";
import { labelAgeGroup, labelEmploymentStatus, labelRegion, EMPLOYMENT_STATUS_LABELS, REGION_LABELS } from "@/lib/labels";
import type { AdminUserListItem, AgeGroup, EmploymentStatus, LeadGrade, Region } from "@/types";

export interface AdminUserListFilter {
  page?: number;
  pageSize?: number;
  /** 이름/이메일/전화번호 검색어 (스펙 25번) */
  keyword?: string;
  leadGrade?: LeadGrade;
  employmentStatus?: EmploymentStatus;
  region?: Region;
  marketingConsent?: boolean;
  /** 직업검사 완료 여부 */
  assessmentCompleted?: boolean;
  /** 지원금검사 완료 여부 */
  supportCompleted?: boolean;
}

export interface AdminUserListResult {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function intersectIdSets(sets: string[][]): string[] | null {
  if (sets.length === 0) return null;
  let result: Set<string> = new Set(sets[0]);
  for (const ids of sets.slice(1)) {
    const set = new Set(ids);
    result = new Set([...result].filter((id: string) => set.has(id)));
  }
  return [...result];
}

/**
 * /admin/users 실DB 목록 조회 (스펙 24/25/48번).
 *
 * profiles를 기준으로 server-side pagination + 검색을 수행하고, Lead Grade / 취업상태 / 지역 /
 * 직업검사·지원금검사 완료 여부 필터는 "id만" 조회하는 소규모 보조 쿼리로 교집합을 구한 뒤
 * `.in('id', ids)`로 좁힌다 (N+1 방지 - 필터 쿼리는 페이지 크기와 무관하게 고정된 개수).
 * 화면에 필요한 부가 정보(취업상태/지역/Lead/유입경로)는 "현재 페이지에 표시될 회원 id들"에 대해서만
 * batch(`in`) 조회한다.
 */
export async function listAdminUsersPaged(filter: AdminUserListFilter = {}): Promise<AdminUserListResult> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filter.pageSize ?? DEFAULT_PAGE_SIZE));

  if (!isSupabaseMode()) {
    return listAdminUsersPagedMock(filter, page, pageSize);
  }

  const client = createAdminSupabaseClient();
  if (!client) {
    throwDataSourceError("listAdminUsersPaged", new Error("Supabase admin client unavailable"));
  }

  const restrictionQueries: Promise<string[]>[] = [];

  if (filter.leadGrade) {
    restrictionQueries.push(
      (async () => {
        const leads = await getLeadRepository().findAll({ grade: filter.leadGrade });
        return leads.map((l) => l.userId);
      })(),
    );
  }
  if (filter.employmentStatus) {
    restrictionQueries.push(
      (async () => {
        const res = await client.from("career_profiles").select("user_id").eq("employment_status", filter.employmentStatus);
        if (res.error) throwDataSourceError("listAdminUsersPaged.employmentStatus", res.error);
        return (res.data ?? []).map((r) => String((r as { user_id: string }).user_id));
      })(),
    );
  }
  if (filter.region) {
    restrictionQueries.push(
      (async () => {
        const res = await client.from("career_profiles").select("user_id").eq("preferred_region", filter.region);
        if (res.error) throwDataSourceError("listAdminUsersPaged.region", res.error);
        return (res.data ?? []).map((r) => String((r as { user_id: string }).user_id));
      })(),
    );
  }
  if (filter.assessmentCompleted) {
    restrictionQueries.push(
      (async () => {
        const res = await client.from("assessment_results").select("user_id").not("user_id", "is", null);
        if (res.error) throwDataSourceError("listAdminUsersPaged.assessmentCompleted", res.error);
        return [...new Set((res.data ?? []).map((r) => String((r as { user_id: string }).user_id)))];
      })(),
    );
  }
  if (filter.supportCompleted) {
    restrictionQueries.push(
      (async () => {
        const res = await client
          .from("support_assessment_sessions")
          .select("user_id")
          .eq("status", "completed")
          .not("user_id", "is", null);
        if (res.error) throwDataSourceError("listAdminUsersPaged.supportCompleted", res.error);
        return [...new Set((res.data ?? []).map((r) => String((r as { user_id: string }).user_id)))];
      })(),
    );
  }

  const restrictionSets = await Promise.all(restrictionQueries);
  const restrictedIds = intersectIdSets(restrictionSets);

  if (restrictedIds !== null && restrictedIds.length === 0) {
    return { items: [], total: 0, page, pageSize };
  }

  let query = client
    .from("profiles")
    .select("id,name,email,phone,marketing_consent,created_at,last_active_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filter.keyword?.trim()) {
    const kw = filter.keyword.trim().replace(/[%,]/g, "");
    if (kw) query = query.or(`name.ilike.%${kw}%,email.ilike.%${kw}%,phone.ilike.%${kw}%`);
  }
  if (filter.marketingConsent !== undefined) {
    query = query.eq("marketing_consent", filter.marketingConsent);
  }
  if (restrictedIds !== null) {
    query = query.in("id", restrictedIds);
  }

  const offset = (page - 1) * pageSize;
  const { data, error, count } = await query.range(offset, offset + pageSize - 1);
  if (error) throwDataSourceError("listAdminUsersPaged.profiles", error);

  const rows = (data ?? []) as Record<string, unknown>[];
  const ids = rows.map((r) => String(r.id));

  const [careerResult, leadsResult, acquisitionResult] = await Promise.all([
    ids.length > 0
      ? client
          .from("career_profiles")
          .select("user_id,age_group,preferred_region,employment_status,desired_job_categories")
          .in("user_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length > 0
      ? client.from("leads").select("user_id,grade,score,primary_interest").in("user_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length > 0
      ? client.from("user_acquisition").select("user_id,utm_source").in("user_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (careerResult.error) throwDataSourceError("listAdminUsersPaged.career", careerResult.error);
  if (leadsResult.error) throwDataSourceError("listAdminUsersPaged.leads", leadsResult.error);
  if (acquisitionResult.error) throwDataSourceError("listAdminUsersPaged.acquisition", acquisitionResult.error);

  const careerByUser = new Map((careerResult.data ?? []).map((r) => [String((r as { user_id: string }).user_id), r]));
  const leadByUser = new Map((leadsResult.data ?? []).map((r) => [String((r as { user_id: string }).user_id), r]));
  const acquisitionByUser = new Map(
    (acquisitionResult.data ?? []).map((r) => [String((r as { user_id: string }).user_id), r]),
  );

  const items: AdminUserListItem[] = rows.map((row) => {
    const id = String(row.id);
    const career = careerByUser.get(id) as
      | { age_group?: AgeGroup; preferred_region?: Region; employment_status?: EmploymentStatus }
      | undefined;
    const lead = leadByUser.get(id) as { grade?: LeadGrade; score?: number; primary_interest?: string } | undefined;
    const acquisition = acquisitionByUser.get(id) as { utm_source?: string } | undefined;

    return {
      id,
      name: (row.name as string | null) ?? "-",
      email: (row.email as string | null) ?? "-",
      phone: (row.phone as string | null) ?? "-",
      ageGroup: labelAgeGroup(career?.age_group),
      region: labelRegion(career?.preferred_region),
      employmentStatus: labelEmploymentStatus(career?.employment_status),
      signupChannel: acquisition?.utm_source ?? "-",
      joinedAt: String(row.created_at).slice(0, 10),
      leadGrade: lead?.grade ?? "D",
      leadScore: lead?.score,
      primaryInterest: lead?.primary_interest ?? undefined,
      marketingConsent: Boolean(row.marketing_consent),
      lastActiveAt: (row.last_active_at as string | null) ?? undefined,
      isTestAccount: String(row.email ?? "").toLowerCase().endsWith("@baro.local"),
    };
  });

  return { items, total: count ?? items.length, page, pageSize };
}

/**
 * Mock Mode 목록 조회. Mock 데이터는 이미 한글 라벨(예: "서울", "경력단절")로 저장돼 있어
 * employmentStatus/region 필터는 코드값(Region/EmploymentStatus)을 한글 라벨로 변환해 비교한다.
 */
function listAdminUsersPagedMock(
  filter: AdminUserListFilter,
  page: number,
  pageSize: number,
): AdminUserListResult {
  let items = [...mockAdminUsers];

  if (filter.keyword?.trim()) {
    const kw = filter.keyword.trim().toLowerCase();
    items = items.filter(
      (u) => u.name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw) || u.phone.includes(kw),
    );
  }
  if (filter.leadGrade) items = items.filter((u) => u.leadGrade === filter.leadGrade);
  if (filter.marketingConsent !== undefined) {
    items = items.filter((u) => (u.marketingConsent ?? true) === filter.marketingConsent);
  }
  if (filter.employmentStatus) {
    const label = EMPLOYMENT_STATUS_LABELS[filter.employmentStatus];
    items = items.filter((u) => u.employmentStatus === label);
  }
  if (filter.region) {
    const label = REGION_LABELS[filter.region];
    items = items.filter((u) => u.region === label);
  }

  const total = items.length;
  const offset = (page - 1) * pageSize;
  return { items: items.slice(offset, offset + pageSize), total, page, pageSize };
}
