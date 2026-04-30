/**
 * Audit log table for the owner dashboard. Server-rendered (no client
 * interactions on the table itself) — filters live as query params on the
 * parent page so this stays as a static React tree.
 */

export interface AuditRow {
  id:                    string;
  action:                string;
  target_type:           string;
  target_id:             string;
  reason:                string | null;
  metadata:              Record<string, unknown> | null;
  created_at:            string;
  acting_staff_name:     string | null;
  approving_staff_name:  string | null;
}

const ACTION_LABEL: Record<string, string> = {
  discount_above_threshold: "Discount above threshold",
  void_session:             "Voided session",
  void_order_after_send:    "Voided sent order",
  void_order_item:          "Removed item from order",
};

const ACTION_COLOR: Record<string, string> = {
  discount_above_threshold: "bg-[#E8A020]/15 text-[#E8A020]",
  void_session:             "bg-rose-100 text-rose-700",
  void_order_after_send:    "bg-rose-100 text-rose-700",
  void_order_item:          "bg-rose-100 text-rose-700",
};

function formatNairobi(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    hour:    "2-digit",
    minute:  "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

function formatMetadata(action: string, metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  if (action === "discount_above_threshold") {
    const pct = metadata.discount_pct;
    const threshold = metadata.threshold;
    if (typeof pct === "number") {
      return `${pct}% (threshold ${typeof threshold === "number" ? `${threshold}%` : "—"})`;
    }
  }
  if (action === "void_session" || action === "void_order_after_send") {
    const prev = metadata.previous_status;
    if (typeof prev === "string") return `Was: ${prev}`;
  }
  return null;
}

export function AuditLogTable({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E2DDD5] p-8 text-center">
        <p className="text-[14px] font-bold text-[#16130C]">No restricted actions in this period</p>
        <p className="text-[12px] text-[#9C9485] mt-1">
          When a waiter takes an action that needs a manager override, it shows up here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2DDD5] overflow-hidden">
      {/* Mobile: stacked cards */}
      <ul className="md:hidden divide-y divide-[#E2DDD5]">
        {rows.map((row) => {
          const meta = formatMetadata(row.action, row.metadata);
          return (
            <li key={row.id} className="p-4">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                    ACTION_COLOR[row.action] ?? "bg-[#F4F1EC] text-[#9C9485]"
                  }`}
                >
                  {ACTION_LABEL[row.action] ?? row.action}
                </span>
                <span className="text-[11px] text-[#9C9485]">{formatNairobi(row.created_at)}</span>
              </div>
              <p className="text-[13px] text-[#16130C]">
                <span className="font-semibold">{row.acting_staff_name ?? "—"}</span>
                {row.approving_staff_name && row.approving_staff_name !== row.acting_staff_name && (
                  <span className="text-[#9C9485]"> · approved by {row.approving_staff_name}</span>
                )}
              </p>
              {meta && <p className="text-[12px] text-[#5E5848] mt-0.5">{meta}</p>}
              {row.reason && (
                <p className="text-[12px] text-[#3D3A32] mt-1 italic">&ldquo;{row.reason}&rdquo;</p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Desktop: table */}
      <table className="hidden md:table w-full text-[13px]">
        <thead className="bg-[#F4F1EC] text-[11px] uppercase tracking-wide text-[#5E5848]">
          <tr>
            <th className="text-left px-4 py-2">When</th>
            <th className="text-left px-4 py-2">Action</th>
            <th className="text-left px-4 py-2">Staff</th>
            <th className="text-left px-4 py-2">Approved by</th>
            <th className="text-left px-4 py-2">Detail</th>
            <th className="text-left px-4 py-2">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F4F1EC]">
          {rows.map((row) => {
            const meta = formatMetadata(row.action, row.metadata);
            return (
              <tr key={row.id}>
                <td className="px-4 py-3 text-[#5E5848] whitespace-nowrap">
                  {formatNairobi(row.created_at)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap ${
                      ACTION_COLOR[row.action] ?? "bg-[#F4F1EC] text-[#9C9485]"
                    }`}
                  >
                    {ACTION_LABEL[row.action] ?? row.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#16130C] font-semibold">
                  {row.acting_staff_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-[#5E5848]">
                  {row.approving_staff_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-[#5E5848]">{meta ?? "—"}</td>
                <td className="px-4 py-3 text-[#3D3A32] italic max-w-[280px] truncate" title={row.reason ?? undefined}>
                  {row.reason ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
