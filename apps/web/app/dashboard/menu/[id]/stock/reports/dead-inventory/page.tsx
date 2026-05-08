import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Row {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  current_qty: number;
  current_value_kes: number;
  last_sale_at: string | null;
  cost_per_unit: number;
}

function fmtKES(n: number): string {
  return `KSh ${Math.round(n).toLocaleString("en-KE")}`;
}
function thirtyDaysAgoMs(): number {
  return Date.now() - 30 * 24 * 60 * 60 * 1000;
}

function fmtRel(iso: string | null): string {
  if (!iso) return "never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000));
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

export default async function DeadInventoryPage({ params }: PageProps) {
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

  const { data } = await adminClient
    .from("v_current_stock")
    .select("ingredient_id, ingredient_name, unit, current_qty, current_value_kes, last_sale_at, cost_per_unit")
    .eq("business_id", user.id)
    .eq("archived", false)
    .gt("current_qty", 0);

  // Filter for dead: current_qty > 0 AND no sale_out in 30+ days (or never)
  const cutoff = thirtyDaysAgoMs();
  const dead: Row[] = ((data ?? []) as Row[])
    .filter((r) => !r.last_sale_at || new Date(r.last_sale_at).getTime() < cutoff)
    .sort((a, b) => Number(b.current_value_kes) - Number(a.current_value_kes));

  const totalValue = dead.reduce((s, r) => s + Number(r.current_value_kes), 0);

  return (
    <div>
      <div className="mb-5">
        <Link href={`/dashboard/menu/${menu.id}/stock/reports`} className="text-[13px] text-[#9C9485] hover:text-[#16130C]">
          ← Back to reports
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Dead inventory
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Stock you&apos;re paying to store but not selling. 30+ days since the last sale_out.
        </p>
      </div>

      {dead.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center">
          <p className="text-[40px] mb-2">✅</p>
          <p className="font-display text-[16px] font-bold text-[#16130C]">Everything is moving</p>
          <p className="text-[13px] text-[#9C9485] mt-1">
            Every ingredient with stock on hand has been sold in the last 30 days.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-[#E2DDD5] p-5 mb-4">
            <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wide">Money tied up</p>
            <p className="font-display text-[28px] lg:text-[36px] font-bold tracking-[-0.02em] text-amber-800">
              {fmtKES(totalValue)}
            </p>
            <p className="text-[12px] text-[#9C9485] mt-1">
              Across {dead.length} ingredient{dead.length === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2DDD5] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FAFAF8] border-b border-[#E2DDD5]">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#9C9485]">
                    <th className="px-4 py-2.5">Ingredient</th>
                    <th className="px-4 py-2.5 text-right">On hand</th>
                    <th className="px-4 py-2.5 text-right">Value</th>
                    <th className="px-4 py-2.5 hidden sm:table-cell">Last sale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F1EC]">
                  {dead.map((r) => (
                    <tr key={r.ingredient_id} className="text-[13px]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/menu/${menu.id}/stock/movements?ingredient_id=${r.ingredient_id}`}
                          className="font-semibold text-[#16130C] hover:text-[#E8A020]"
                        >
                          {r.ingredient_name}
                        </Link>
                        <p className="text-[11px] text-[#9C9485]">{fmtKES(Number(r.cost_per_unit))} / {r.unit}</p>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-[#16130C] font-semibold">
                        {Number(r.current_qty).toLocaleString("en-KE", { maximumFractionDigits: 2 })} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-amber-800">
                        {fmtKES(Number(r.current_value_kes))}
                      </td>
                      <td className="px-4 py-3 text-[#9C9485] hidden sm:table-cell">{fmtRel(r.last_sale_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
