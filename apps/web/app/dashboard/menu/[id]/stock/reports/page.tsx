import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";

interface PageProps {
  params: Promise<{ id: string }>;
}

function thirtyDaysAgoMs(): number {
  return Date.now() - 30 * 24 * 60 * 60 * 1000;
}

function fmtKES(n: number, opts?: { compact?: boolean }): string {
  if (!isFinite(n)) return "—";
  if (opts?.compact && Math.abs(n) >= 1000) {
    return `KSh ${(n / 1000).toLocaleString("en-KE", { maximumFractionDigits: 1 })}k`;
  }
  return `KSh ${Math.round(n).toLocaleString("en-KE")}`;
}

interface DishMargin {
  menu_item_name: string;
  margin_pct: number;
  portions_sold: number;
}

export default async function ReportsHomePage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, stock_enabled")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");
  if (!menu.stock_enabled) redirect(`/dashboard/menu/${id}/stock`);

  // Fan-out the headline numbers in parallel. Each query is cheap.
  const [
    liveStock,
    deadIngredients,
    priceAlerts,
    marginRows,
    lastCount,
  ] = await Promise.all([
    adminClient
      .from("v_current_stock")
      .select("ingredient_id, current_qty, days_of_cover, low_stock_threshold")
      .eq("business_id", user.id)
      .eq("archived", false),
    adminClient
      .from("v_current_stock")
      .select("ingredient_id, ingredient_name, current_qty, current_value_kes, last_sale_at")
      .eq("business_id", user.id)
      .eq("archived", false)
      .gt("current_qty", 0),
    adminClient.rpc("fn_supplier_price_alerts"),
    adminClient
      .from("mv_dish_margin_30d")
      .select("menu_item_name, margin_pct, portions_sold")
      .eq("business_id", user.id)
      .gt("portions_sold", 0)
      .order("margin_pct", { ascending: false })
      .limit(200),
    // Most recent count_adjustment, used as "last variance check".
    adminClient
      .from("stock_movements")
      .select("created_at, total_cost")
      .eq("business_id", user.id)
      .eq("source", "variance_report")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Live stock: count rows that are running low (days < 7 OR below threshold).
  const lowStockCount =
    (liveStock.data ?? []).filter((r) => {
      const days = r.days_of_cover == null ? null : Number(r.days_of_cover);
      const qty = Number(r.current_qty);
      const thr = r.low_stock_threshold == null ? null : Number(r.low_stock_threshold);
      const lowDays = days != null && days < 7;
      const belowThr = thr != null && qty <= thr;
      return lowDays || belowThr;
    }).length;

  // Dead inventory: current_qty > 0 AND last_sale_at older than 30 days
  // (or never).
  const thirtyDaysAgo = thirtyDaysAgoMs();
  const deadList = (deadIngredients.data ?? []).filter((r) => {
    if (!r.last_sale_at) return true;
    return new Date(r.last_sale_at).getTime() < thirtyDaysAgo;
  });
  const deadValue = deadList.reduce((s, r) => s + Number(r.current_value_kes ?? 0), 0);

  // Margin top/bottom from the MV (rows already filtered to portions_sold > 0).
  const margin = (marginRows.data ?? []) as DishMargin[];
  const top = margin[0] ?? null;
  const bottom = margin[margin.length - 1] ?? null;

  // Variance: most recent count's headline figure (value of adjustment).
  const lastCountAt = lastCount.data?.created_at ?? null;
  const lastCountVariance = lastCount.data?.total_cost ?? null;

  // Supplier prices: how many ingredients alerted.
  const priceAlertCount = (priceAlerts.data ?? []).filter((r: { delta_pct: number | null }) =>
    r.delta_pct != null && r.delta_pct >= 10,
  ).length;

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/menu/${menu.id}/stock`} className="text-[13px] text-[#9C9485] hover:text-[#16130C]">
          ← Back to Klickenya Kitchen
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Reports
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Where the money is — and where it&apos;s leaking.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        <ReportTile
          href={`/dashboard/menu/${menu.id}/stock/reports/live-stock`}
          icon="📦"
          title="Live stock"
          headline={
            lowStockCount === 0
              ? "All ingredients in good shape"
              : `${lowStockCount} ingredient${lowStockCount === 1 ? "" : "s"} running low`
          }
          tone={lowStockCount > 0 ? "warn" : "ok"}
        />
        <ReportTile
          href={`/dashboard/menu/${menu.id}/stock/reports/variance`}
          icon="🔍"
          title="Theoretical vs Actual"
          headline={
            lastCountAt
              ? `Last count: ${fmtKES(Number(lastCountVariance) || 0)} variance`
              : "No count yet — go count"
          }
          tone={
            lastCountAt && lastCountVariance != null && Math.abs(Number(lastCountVariance)) > 0
              ? Math.abs(Number(lastCountVariance)) > 5000
                ? "danger"
                : "warn"
              : "neutral"
          }
        />
        <ReportTile
          href={`/dashboard/menu/${menu.id}/stock/reports/margin`}
          icon="📈"
          title="Margin by dish"
          headline={
            margin.length === 0
              ? "No sales in the last 30 days"
              : `Top: ${top!.menu_item_name} (${Math.round(top!.margin_pct)}%) · Bottom: ${bottom!.menu_item_name} (${Math.round(bottom!.margin_pct)}%)`
          }
          tone="neutral"
        />
        <ReportTile
          href={`/dashboard/menu/${menu.id}/stock/reports/supplier-prices`}
          icon="📊"
          title="Supplier price trend"
          headline={
            priceAlertCount === 0
              ? "Prices stable this month"
              : `${priceAlertCount} ingredient${priceAlertCount === 1 ? "" : "s"} rose >10% this month`
          }
          tone={priceAlertCount > 0 ? "warn" : "ok"}
        />
        <ReportTile
          href={`/dashboard/menu/${menu.id}/stock/reports/dead-inventory`}
          icon="🥀"
          title="Dead inventory"
          headline={
            deadList.length === 0
              ? "Everything is moving"
              : `${deadList.length} ingredient${deadList.length === 1 ? "" : "s"} idle 30+ days · ${fmtKES(deadValue, { compact: true })}`
          }
          tone={deadList.length > 0 ? "warn" : "ok"}
        />
      </div>
    </div>
  );
}

function ReportTile({
  href,
  icon,
  title,
  headline,
  tone,
}: {
  href: string;
  icon: string;
  title: string;
  headline: string;
  tone: "ok" | "warn" | "danger" | "neutral";
}) {
  const headlineCls =
    tone === "danger"
      ? "text-rose-700"
      : tone === "warn"
        ? "text-amber-800"
        : tone === "ok"
          ? "text-emerald-700"
          : "text-[#5E5848]";
  return (
    <Link
      href={href}
      className="block bg-white rounded-2xl border border-[#E2DDD5] shadow-sm p-5 lg:p-6 hover:border-[#E8A020]/60 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[28px] leading-none">{icon}</span>
      </div>
      <p className="font-display text-[16px] font-bold text-[#16130C] mb-1.5">{title}</p>
      <p className={`text-[13px] font-semibold leading-[1.4] ${headlineCls}`}>{headline}</p>
    </Link>
  );
}
