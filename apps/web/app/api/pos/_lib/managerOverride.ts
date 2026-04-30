import { adminClient } from "@/lib/supabase/admin";

/**
 * Manager override validation + audit logging.
 *
 * Restricted actions in the POS (large discount, voiding a sent order,
 * voiding a billed/paid session) require either:
 *   - the acting staff to have role "manager" themselves, or
 *   - a "manager_override_pin" passed in the API body that matches an
 *     active manager on the same menu.
 *
 * Either way, every restricted action writes one row to staff_audit_log so
 * the owner can review the day's overrides next morning.
 *
 * V2: PIN-on-modal flow only (the manager walks over and taps their PIN
 * on the same device). V3 may add owner-issued override codes — that's a
 * separate column on staff_audit_log keyed by code id, not implemented here.
 */

export type AuditAction =
  | "discount_above_threshold"
  | "void_session"
  | "void_order_after_send"
  | "void_order_item";

export type AuditTargetType = "session" | "order";

export interface AuditLogEntry {
  menuId:               string;
  actingStaffId:        string | null;     // null if the owner acted via dashboard
  approvingStaffId:     string | null;     // who approved — same as acting if manager-direct
  action:               AuditAction;
  targetType:           AuditTargetType;
  targetId:             string;
  reason:               string | null;
  metadata?:            Record<string, unknown>;
}

/**
 * Resolve a manager override for a restricted action.
 * Returns the approving manager's staff id, or null if neither the actor is
 * a manager nor the override PIN is valid for this menu.
 *
 * Caller passes:
 *   - actingRole: the role on the staff cookie (or "owner" if owner Supabase auth)
 *   - actingStaffId: the staff id (null if owner)
 *   - menuId: scope of the override
 *   - overridePin: optional PIN supplied in the request body
 */
export async function resolveManagerApproval(args: {
  actingRole:    string;
  actingStaffId: string | null;
  menuId:        string;
  overridePin?:  string | null;
}): Promise<{ approvingStaffId: string | null; ok: true } | { ok: false; error: string }> {
  // Owner doing it directly: always allowed, no audit attribution to a
  // staff member (approvingStaffId stays null).
  if (args.actingRole === "owner") {
    return { ok: true, approvingStaffId: null };
  }

  // Manager doing it directly: approvingStaffId == actingStaffId.
  if (args.actingRole === "manager" && args.actingStaffId) {
    return { ok: true, approvingStaffId: args.actingStaffId };
  }

  // Anyone else: a valid manager override PIN is required.
  const pin = args.overridePin?.trim();
  if (!pin || !/^\d{4}$/.test(pin)) {
    return { ok: false, error: "Manager PIN required" };
  }

  // Reject self-override: a manager can't bypass with their own PIN; they
  // should sign in directly. A cashier/waiter using *another* manager's PIN
  // is exactly the override flow we want.
  const { data: manager } = await adminClient
    .from("restaurant_staff")
    .select("id, menu_id, role, is_active")
    .eq("menu_id", args.menuId)
    .eq("pin", pin)
    .maybeSingle();

  if (!manager || !manager.is_active || manager.role !== "manager") {
    return { ok: false, error: "Invalid manager PIN" };
  }
  return { ok: true, approvingStaffId: manager.id };
}

/**
 * Insert one audit log row. Best-effort — logs to console on failure but
 * never blocks the action from completing (auditing must not become a
 * single point of failure for the cash-register flow).
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  const { error } = await adminClient
    .from("staff_audit_log")
    .insert({
      menu_id:             entry.menuId,
      acting_staff_id:     entry.actingStaffId,
      approving_staff_id:  entry.approvingStaffId,
      action:              entry.action,
      target_type:         entry.targetType,
      target_id:           entry.targetId,
      reason:              entry.reason,
      metadata:            entry.metadata ?? null,
    });
  if (error) {
    console.error("[audit] failed to write audit log:", error, { entry });
  }
}
