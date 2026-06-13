import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { VarianceClient } from "./VarianceClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VariancePage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, stock_enabled")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");
  if (!menu.stock_enabled) redirect(`/dashboard/menu/${id}/stock`);

  return (
    <div>
      <div className="mb-5">
        <Link href={`/dashboard/menu/${menu.id}/stock/reports`} className="text-[13px] text-text3 hover:text-dark">
          ← Back to reports
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mt-2">
          Theoretical vs Actual
        </h1>
        <p className="text-[13px] text-text3 mt-1">
          What stock should be there vs what&apos;s actually there. The gap is where money goes.
        </p>
      </div>
      <VarianceClient />
    </div>
  );
}
