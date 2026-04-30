import { redirect } from "next/navigation";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { AuditLogTable, type AuditRow } from "@/components/dashboard/menu/AuditLogTable";

interface PageProps {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ days?: string; action?: string }>;
}

/**
 * Owner audit report. Lists every restricted action (manager override or
 * direct manager action) for this menu, newest first. Filters: last N days,
 * action type. Owner-only — staff can't read this table directly.
 */
export default async function AuditLogPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { data: menu } = await adminClient
    .from("menus")
    .select("id, name, business_id")
    .eq("id", id)
    .eq("business_id", user.id)
    .single();
  if (!menu) redirect("/dashboard");

  const days = Math.max(1, Math.min(90, Number(sp.days) || 7));
  // Server component, fresh per request — Date.now() is fine here.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const actionFilter = sp.action;

  let query = adminClient
    .from("staff_audit_log")
    .select(`
      id, action, target_type, target_id, reason, metadata, created_at,
      acting_staff_id, approving_staff_id
    `)
    .eq("menu_id", id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);
  if (actionFilter && actionFilter !== "all") {
    query = query.eq("action", actionFilter);
  }
  const { data: logs } = await query;

  // Resolve staff names in one follow-up query so the table can render
  // "Marco" / "Aisha" instead of UUIDs.
  const staffIds = Array.from(
    new Set(
      (logs ?? [])
        .flatMap((r) => [r.acting_staff_id, r.approving_staff_id])
        .filter((v): v is string => !!v),
    ),
  );
  const staffMap = new Map<string, string>();
  if (staffIds.length > 0) {
    const { data: staff } = await adminClient
      .from("restaurant_staff")
      .select("id, name")
      .in("id", staffIds);
    for (const s of staff ?? []) staffMap.set(s.id, s.name);
  }

  const rows: AuditRow[] = (logs ?? []).map((r) => ({
    id:                  r.id,
    action:              r.action,
    target_type:         r.target_type,
    target_id:           r.target_id,
    reason:              r.reason,
    metadata:            (r.metadata ?? null) as Record<string, unknown> | null,
    created_at:          r.created_at,
    acting_staff_name:   r.acting_staff_id ? staffMap.get(r.acting_staff_id) ?? null : null,
    approving_staff_name: r.approving_staff_id ? staffMap.get(r.approving_staff_id) ?? null : null,
  }));

  return (
    <div className="px-4 py-5 lg:px-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#9C9485] font-bold">
            Audit log
          </p>
          <h1 className="font-display text-[22px] font-bold text-[#16130C] tracking-tight">
            {menu.name}
          </h1>
          <p className="text-[12px] text-[#9C9485] mt-1">
            Manager overrides and restricted actions, last {days} {days === 1 ? "day" : "days"}.
          </p>
        </div>
      </div>

      {/* Filter pills (links — server-rendered, no client JS needed) */}
      <div className="flex flex-wrap gap-2 mb-4 text-[12px] font-semibold">
        {[
          { label: "All actions",         action: "all" },
          { label: "Discount > threshold", action: "discount_above_threshold" },
          { label: "Removed item",         action: "void_order_item" },
          { label: "Voided session",       action: "void_session" },
          { label: "Voided sent order",    action: "void_order_after_send" },
        ].map((f) => {
          const active = (actionFilter ?? "all") === f.action;
          return (
            <a
              key={f.action}
              href={`/dashboard/menu/${id}/audit?days=${days}${f.action === "all" ? "" : `&action=${f.action}`}`}
              className={`px-3 py-1.5 rounded-full border ${
                active
                  ? "bg-[#16130C] text-white border-[#16130C]"
                  : "bg-white text-[#16130C] border-[#E2DDD5] hover:border-[#16130C]"
              }`}
            >
              {f.label}
            </a>
          );
        })}
        <span className="ml-auto flex gap-2">
          {[1, 7, 30].map((d) => (
            <a
              key={d}
              href={`/dashboard/menu/${id}/audit?days=${d}${actionFilter ? `&action=${actionFilter}` : ""}`}
              className={`px-3 py-1.5 rounded-full border ${
                days === d
                  ? "bg-[#16130C] text-white border-[#16130C]"
                  : "bg-white text-[#16130C] border-[#E2DDD5] hover:border-[#16130C]"
              }`}
            >
              {d === 1 ? "Today" : `${d} days`}
            </a>
          ))}
        </span>
      </div>

      <AuditLogTable rows={rows} />
    </div>
  );
}
