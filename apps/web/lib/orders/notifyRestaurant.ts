/**
 * Tell the restaurant an order exists. Fire-and-forget from POST /api/orders:
 * the order is already saved by the time this runs, so nothing here may throw
 * or fail the request — a lost email is logged, never surfaced to the guest.
 *
 * Recipients, in order (same resolution as reservation emails):
 *   1. Sanity listing notificationEmail1/2, found via menus.listing_slug
 *   2. host_profiles.email for menus.business_id, only when Sanity gave none
 *   3. ADMIN_EMAIL, always, so the command centre sees every order
 */
import { Resend } from "resend";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { newOrderEmailHtml, newOrderEmailSubject } from "@/lib/email/orderEmails";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
const LOG = "[notifyRestaurant]";

export type NewOrderNotification = {
  menuId: string;
  orderId: string;
  shortId: string;
  orderType: "takeaway" | "delivery";
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  note: string | null;
  lines: { name: string; quantity: number; lineTotal: number; options?: string | null }[];
  subtotalKes: number;
  deliveryFeeKes: number;
  totalKes: number;
};

type MenuRow = {
  id: string;
  name: string | null;
  listing_slug: string | null;
  business_id: string | null;
};

type ListingDoc = {
  _id: string;
  title?: string | null;
  notificationEmail1?: string | null;
  notificationEmail2?: string | null;
} | null;

/** Never throws. Returns the recipients it sent to (empty when none/failed). */
export async function notifyRestaurantOfOrder(n: NewOrderNotification): Promise<string[]> {
  try {
    // (a) The menu the order was placed against.
    const { data: menuData, error: menuError } = await adminClient
      .from("menus")
      .select("id, name, listing_slug, business_id")
      .eq("id", n.menuId)
      .maybeSingle();
    if (menuError) {
      // PostgREST 400s (a stale projection, say) come back here, not as a throw.
      console.error(LOG, `menu lookup failed for order ${n.orderId}:`, menuError.message);
      return [];
    }
    if (!menuData) {
      console.warn(LOG, `no menu ${n.menuId} for order ${n.orderId}`);
      return [];
    }
    const menu = menuData as MenuRow;

    const emails: string[] = [];
    // The listing title is the name the restaurant goes by; the menu label is
    // an internal "X Menu" and only a fallback.
    let restaurantName = (menu.name ?? "").replace(/\s+menu\s*$/i, "").trim() || "Your restaurant";
    let listingId: string | null = null;

    // (b) Sanity listing → notification emails. Non-blocking: a Sanity outage
    // still lets the host_profiles fallback and ADMIN_EMAIL hear about the order.
    if (menu.listing_slug) {
      try {
        const listing = await sanityClient.fetch<ListingDoc>(
          `*[_type == "listing" && slug.current == $slug][0]{ _id, title, notificationEmail1, notificationEmail2 }`,
          { slug: menu.listing_slug },
        );
        if (listing?._id) listingId = listing._id;
        if (listing?.title) restaurantName = listing.title;
        if (listing?.notificationEmail1) emails.push(listing.notificationEmail1);
        if (listing?.notificationEmail2) emails.push(listing.notificationEmail2);
      } catch (err) {
        console.error(LOG, `sanity lookup failed for listing ${menu.listing_slug}:`, err);
      }
    }

    // (c) No listing emails → the host account's own address.
    if (emails.length === 0 && menu.business_id) {
      const { data: host, error: hostError } = await adminClient
        .from("host_profiles")
        .select("email")
        .eq("user_id", menu.business_id)
        .limit(1)
        .maybeSingle();
      if (hostError) {
        console.error(LOG, `host_profiles lookup failed for ${menu.business_id}:`, hostError.message);
      }
      if (host?.email) emails.push(host.email);
    }

    // (d) Admin always gets a copy.
    if (process.env.ADMIN_EMAIL) emails.push(process.env.ADMIN_EMAIL);

    const recipients = dedupe(emails);
    if (recipients.length === 0) {
      console.warn(LOG, `no recipients for order ${n.orderId} (menu ${menu.id}); nothing sent`);
      return [];
    }

    // (e) Deep-link the listing's queue when the listing resolved; otherwise
    // the listings index, where the host picks it.
    const queueUrl = listingId
      ? `${SITE}/manage/listings/${listingId}/orders`
      : `${SITE}/manage/listings`;

    // (f) Send.
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(LOG, `RESEND_API_KEY not set; order ${n.orderId} email skipped`);
      return [];
    }
    const input = {
      restaurantName,
      shortId: n.shortId,
      orderType: n.orderType,
      customerName: n.customerName,
      customerPhone: n.customerPhone,
      deliveryAddress: n.deliveryAddress,
      note: n.note,
      lines: n.lines,
      subtotalKes: n.subtotalKes,
      deliveryFeeKes: n.deliveryFeeKes,
      totalKes: n.totalKes,
      queueUrl,
    };
    const resend = new Resend(apiKey);
    // Resend reports a rejected send as { error }, not a throw.
    const { data, error } = await resend.emails.send({
      from: "Klickenya Orders <orders@klickenya.com>",
      to: recipients,
      subject: newOrderEmailSubject(input),
      html: newOrderEmailHtml(input),
    });
    if (error) {
      console.error(LOG, `resend rejected order ${n.orderId}:`, error);
      return [];
    }
    console.log(LOG, `order #${n.shortId} sent to ${recipients.length} recipient(s)`, data?.id ?? "");
    return recipients;
  } catch (err) {
    console.error(LOG, `failed for order ${n.orderId}:`, err);
    return [];
  }
}

/** Trim, drop blanks, and dedupe case-insensitively, keeping first spelling. */
function dedupe(emails: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of emails) {
    const email = raw.trim();
    const key = email.toLowerCase();
    if (!email || seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}
