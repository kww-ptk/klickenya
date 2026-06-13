import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { ReferencePricesClient, type PlatformPriceRow } from "./ReferencePricesClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReferencePricesPage({ params }: PageProps) {
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

  // Platform-wide aggregates from purchase_in movements (k-anonymised at >= 3
  // distinct restaurants). Read via adminClient to ensure consistent access
  // regardless of caller's RLS — the view itself enforces the privacy gate.
  const { data: rows } = await adminClient
    .from("v_platform_ingredient_prices")
    .select(
      "canonical_name, unit, restaurant_count, sample_size, median_kes, p25_kes, p75_kes, min_kes, max_kes, last_seen_at",
    )
    .order("canonical_name", { ascending: true })
    .limit(500);

  return (
    <div>
      <div className="mb-5">
        <Link href={`/dashboard/menu/${menu.id}/stock/ingredients`} className="text-[13px] text-text3 hover:text-dark">
          ← Back to ingredients
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mt-2">
          Reference prices
        </h1>
        <p className="text-[13px] text-text3 mt-1">
          Typical KES paid by Klickenya restaurants for common ingredients. A sanity check, not a fixed price list.
        </p>
      </div>
      <ReferencePricesClient initial={(rows ?? []) as PlatformPriceRow[]} />
    </div>
  );
}
