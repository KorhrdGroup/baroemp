import { notFound } from "next/navigation";
import { UserCrmDetailView } from "@/features/admin/user-crm-detail";
import { getUserCrmDetail } from "@/services/user-crm.service";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getUserCrmDetail(id);
  if (!detail) notFound();
  return <UserCrmDetailView detail={detail} />;
}
