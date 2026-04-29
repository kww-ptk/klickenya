import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadFullBillForSession } from "@/app/api/menu/sessions/_lib/sessions";
import { formatKes, formatNairobiDateTime } from "@/lib/pos/bill";
import { ReceiptAutoPrint } from "./ReceiptAutoPrint";

/**
 * Standalone print-optimised receipt page. Opened in a new tab from the bill
 * panel; auto-triggers window.print() once on first paint so the waiter just
 * has to press "Print" in the OS dialog.
 *
 * No POS layout, no header, no tab bar — just the receipt content. The page
 * still inherits the root layout's <html>/<body>, which we mask with a
 * full-bleed white wrapper so the receipt prints cleanly on any printer.
 */

export const metadata = {
  title: "Receipt · Klickenya",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

async function authoriseSession(sessionId: string): Promise<{ menuId: string } | null> {
  const { data: row } = await adminClient
    .from("table_sessions")
    .select("menu_id")
    .eq("id", sessionId)
    .single();
  if (!row) return null;
  const menuId = row.menu_id as string;

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (session && session.menu_id === menuId) {
    const { data: staff } = await adminClient
      .from("restaurant_staff")
      .select("id, is_active, menu_id")
      .eq("id", session.staff_id)
      .single();
    if (staff && staff.is_active && staff.menu_id === menuId) {
      return { menuId };
    }
  }

  // Owner fallback: signed-in business user who owns the menu.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: menu } = await adminClient
    .from("menus")
    .select("id, business_id")
    .eq("id", menuId)
    .single();
  if (menu && menu.business_id === user.id) return { menuId };
  return null;
}

export default async function ReceiptPage({ params }: PageProps) {
  const { sessionId } = await params;

  const auth = await authoriseSession(sessionId);
  if (!auth) {
    redirect("/");
  }

  const full = await loadFullBillForSession(sessionId);
  if (!full) notFound();

  const paidLabel =
    full.payment_method === "mpesa" ? "M-Pesa" :
    full.payment_method === "card"  ? "Card"   :
    full.payment_method === "cash"  ? "Cash"   : null;
  const refSuffix = full.mpesa_ref ? ` (ref: ${full.mpesa_ref})` : "";

  return (
    <div className="receipt-shell">
      <style>{shellCss}</style>

      <main className="receipt">
        <header className="hdr">
          <h1>{full.restaurant.name}</h1>
          {full.restaurant.address && <p className="meta">{full.restaurant.address}</p>}
          {full.restaurant.phone && <p className="meta">{full.restaurant.phone}</p>}
        </header>

        <div className="rule" />

        <section className="info">
          <Row k="Date"   v={formatNairobiDateTime(full.opened_at)} />
          <Row k="Table"  v={full.table_number} />
          <Row k="Covers" v={String(full.covers)} />
          {full.opened_by_name && <Row k="Staff" v={full.opened_by_name} />}
          {full.bill_notes && <Row k="Notes" v={full.bill_notes} />}
        </section>

        <div className="rule" />

        <table className="items">
          <thead>
            <tr>
              <th align="left">Item</th>
              <th align="right">Qty</th>
              <th align="right">Price</th>
            </tr>
          </thead>
          <tbody>
            {full.bill.line_items.map((li, idx) => (
              <tr key={idx}>
                <td>
                  <div>{li.name}{li.options_text ? ` (${li.options_text})` : ""}</div>
                  {li.notes && <div className="note">Note: {li.notes}</div>}
                </td>
                <td align="right">{li.quantity}</td>
                <td align="right">{formatKes(li.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rule" />

        <section className="totals">
          <Row k="Subtotal" v={formatKes(full.bill.subtotal)} />
          {full.bill.discount_pct_amount > 0 && (
            <Row k={`Discount (${full.bill.discount_pct}%)`} v={`-${formatKes(full.bill.discount_pct_amount)}`} />
          )}
          {full.bill.discount_flat_amount > 0 && (
            <Row k="Flat discount" v={`-${formatKes(full.bill.discount_flat_amount)}`} />
          )}
          {full.bill.service_charge_amount > 0 && (
            <Row k={`Service (${full.bill.service_charge_pct}%)`} v={formatKes(full.bill.service_charge_amount)} />
          )}
          <div className="rule small" />
          <Row k="TOTAL" v={formatKes(full.bill.grand_total)} highlight />
          {full.bill.split_count > 1 && (
            <Row k={`Per person (×${full.bill.split_count})`} v={formatKes(full.bill.per_person)} />
          )}
        </section>

        {paidLabel && (
          <>
            <div className="rule" />
            <p className="paid">Paid by: {paidLabel}{refSuffix}</p>
          </>
        )}

        <div className="rule" />

        <footer>
          <p className="thanks">Thank you for dining with us!</p>
          <p className="generated">Generated {formatNairobiDateTime(new Date().toISOString())}</p>
          <div className="rule" />
          <p className="poweredby">Powered by Klickenya</p>
        </footer>

        <ReceiptAutoPrint />
      </main>
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className={`row ${highlight ? "hl" : ""}`}>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

const shellCss = `
  /* Mask the global app chrome — this page must print as a clean receipt. */
  body { background: #fff !important; }
  .receipt-shell { background: #fff; min-height: 100vh; color: #16130C; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  .receipt { max-width: 360px; margin: 24px auto; padding: 16px; }
  .hdr { text-align: center; }
  .hdr h1 { font-size: 18px; margin: 0 0 4px; letter-spacing: 0.02em; font-family: inherit; }
  .hdr .meta { font-size: 11px; color: #4a4a4a; margin: 0; }
  .rule { border-top: 1px dashed #999; margin: 10px 0; }
  .rule.small { margin: 6px 0; }
  .info .row, .totals .row { display: flex; justify-content: space-between; font-size: 12px; padding: 1px 0; }
  .info .row .k, .totals .row .k { color: #555; }
  .totals .row.hl .k, .totals .row.hl .v { font-weight: 800; font-size: 14px; color: #000; }
  table.items { width: 100%; border-collapse: collapse; font-size: 12px; }
  table.items th { font-size: 10px; color: #555; padding: 4px 0; border-bottom: 1px dashed #ccc; font-weight: 600; }
  table.items td { padding: 3px 0; vertical-align: top; }
  table.items td:first-child { padding-right: 8px; }
  table.items .note { font-size: 10px; color: #B45309; font-style: italic; padding-left: 4px; }
  .paid { text-align: center; font-weight: 800; font-size: 13px; margin: 6px 0; }
  footer { text-align: center; }
  footer .thanks { font-size: 12px; margin: 6px 0; }
  footer .generated { font-size: 9px; color: #777; margin: 2px 0; }
  footer .poweredby { font-size: 9px; color: #999; margin: 4px 0 0; }
  /* Hide the global mobile bottom nav and any other site chrome. */
  body > nav, body > header, body > footer:not(.receipt footer), .mobile-bottom-nav { display: none !important; }
  @media print {
    body, .receipt-shell { background: #fff !important; }
    .no-print { display: none !important; }
    .receipt { margin: 0; max-width: none; padding: 8mm; }
    @page { margin: 6mm; }
  }
`;
