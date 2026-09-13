import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth, verifyMenuAccess } from "../../_lib/auth";
import { writeAuditLog } from "@/app/api/pos/_lib/managerOverride";
import { recomputeSessionTotals } from "@/app/api/menu/sessions/_lib/sessions";
import {
  confirmPhraseMatches,
  DELETE_CONFIRM_PHRASE,
  MAX_BULK_DELETE,
} from "@/lib/orders/deletion";

/**
 * POST /api/menu/orders/delete — permanently remove orders.
 *
 *   { menu_id, order_id, confirm }   one order
 *   { menu_id, all: true, confirm }  every order for that menu
 *
 * Built for clearing test data during setup. Orders are financial records:
 * deleting one loses the revenue line, the rider's cash record and the
 * reporting history, and does NOT restore stock that 062 already deducted.
 *
 * Three things guard it, and each covers a different mistake:
 *   the phrase       a deliberate act, not a mis-tap. Checked here, on the
 *                    server — a browser dialog stops a thumb and nothing else.
 *   menu ownership   an owner can only ever clear their own restaurant, even
 *                    with the phrase. Admins may clear any.
 *   a cap            "delete everything" is the request that is catastrophic
 *                    when wrong, so a limit makes an accident partial and
 *                    visible rather than total and silent.
 *
 * order_items go with the order — ON DELETE CASCADE, from 043.
 */
export async function POST(req: NextRequest) {
  let body: { menu_id?: string; order_id?: string; all?: boolean; confirm?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const menuId = body.menu_id ?? "";
  if (!menuId) {
    return NextResponse.json({ error: "menu_id required" }, { status: 400 });
  }

  if (!confirmPhraseMatches(body.confirm)) {
    return NextResponse.json(
      { error: `Type ${DELETE_CONFIRM_PHRASE} exactly to confirm.` },
      { status: 400 },
    );
  }

  // Owner of this menu, or an admin. verifyMenuAccess handles both.
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const menu = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
  if (!menu) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve the target set FIRST: the ids are needed for the audit entry and
  // for session recomputation, both of which are impossible after the delete.
  let targetQuery = adminClient
    .from("orders")
    .select("id, table_session_id, total_kes, status")
    .eq("menu_id", menuId);

  if (!body.all) {
    if (!body.order_id) {
      return NextResponse.json(
        { error: "order_id required, or pass all: true" },
        { status: 400 },
      );
    }
    targetQuery = targetQuery.eq("id", body.order_id);
  }

  const { data: targets, error: readErr } = await targetQuery.limit(MAX_BULK_DELETE);
  if (readErr) {
    console.error("[orders/delete] read error:", readErr);
    return NextResponse.json({ error: "Could not read those orders." }, { status: 500 });
  }
  if (!targets || targets.length === 0) {
    return NextResponse.json({ error: "Nothing to delete." }, { status: 404 });
  }

  const ids = targets.map((t) => t.id as string);
  const sessionIds = Array.from(
    new Set(targets.map((t) => t.table_session_id).filter((v): v is string => !!v)),
  );

  // Recorded before the rows go, so there is still something to say what was
  // removed once the orders themselves cannot answer for it.
  await writeAuditLog({
    menuId,
    actingStaffId: null, // owner or admin, via Supabase auth rather than a staff PIN
    approvingStaffId: null,
    action: "delete_order",
    targetType: "order",
    targetId: ids[0],
    reason: body.all ? "Cleared all orders for this menu" : "Deleted one order",
    metadata: {
      deleted_count: ids.length,
      order_ids: ids,
      total_kes: targets.reduce((n, t) => n + Number(t.total_kes ?? 0), 0),
      by_user: userId,
      as_admin: isAdmin,
    },
  });

  const { error: delErr } = await adminClient.from("orders").delete().in("id", ids);
  if (delErr) {
    console.error("[orders/delete] delete error:", delErr);
    return NextResponse.json({ error: "Could not delete those orders." }, { status: 500 });
  }

  // Any table bill those orders belonged to is now wrong.
  for (const sid of sessionIds) {
    await recomputeSessionTotals(sid);
  }

  return NextResponse.json({
    success: true,
    deleted: ids.length,
    // Says so when the cap truncated the request, rather than reporting
    // "cleared" over orders that are still there.
    capped: body.all === true && ids.length === MAX_BULK_DELETE,
  });
}
