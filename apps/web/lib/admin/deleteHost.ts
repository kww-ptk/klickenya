import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { adminClient } from "@/lib/supabase/admin";
import {
  getAssignedListings,
  unassignListingFromHost,
} from "@/lib/admin/hostListings";
import {
  hostDeletedHtml,
  hostDeletedToAdminHtml,
} from "@/lib/email/hostEmails";

/**
 * Thrown when the host still owns rows in tables that reference public.users /
 * auth.users WITHOUT ON DELETE CASCADE/SET NULL (legacy agents, listings.owner_id,
 * properties.owner_id, bookings.guest_id, …). Mapped to HTTP 409 so the admin
 * gets a clear "resolve dependents first" message instead of a generic 500 with
 * a half-deleted account.
 */
export class HostHasDependentDataError extends Error {
  constructor(
    message = "This host still has dependent records (e.g. an agent profile or legacy listings/bookings). Reassign or remove those before deleting the account."
  ) {
    super(message);
    this.name = "HostHasDependentDataError";
  }
}

/** Postgres foreign-key violation code. */
const FK_VIOLATION = "23503";

export async function deleteHostAccount(input: {
  id: string;
}): Promise<{ success: true; unassignedCount: number }> {
  const { id } = input;

  const { data: host, error } = await adminClient
    .from("host_profiles")
    .select("id, user_id, display_name, email, sanity_host_id")
    .eq("id", id)
    .single();

  if (error || !host) {
    throw new Error("Host not found");
  }

  const hostRef = {
    user_id: host.user_id,
    sanity_host_id: host.sanity_host_id,
  };

  // 1. Delete public.users FIRST — it is the foreign-key bottleneck. Several
  //    legacy tables (agents, listings.owner_id, properties.owner_id,
  //    bookings.guest_id, …) reference public.users WITHOUT ON DELETE CASCADE,
  //    so if the host owns any such row this DELETE fails with a 23503. Doing it
  //    before anything destructive (unassign / host_profiles / auth) means a
  //    blocked delete leaves the account fully intact — no partial orphaning.
  const { error: usersErr } = await adminClient
    .from("users")
    .delete()
    .eq("id", host.user_id);
  if (usersErr) {
    if (usersErr.code === FK_VIOLATION) throw new HostHasDependentDataError();
    throw new Error(usersErr.message);
  }

  // 2. Clear the non-cascade references to auth.users so the auth-user delete
  //    in step 5 isn't blocked. These columns reference auth.users with NO
  //    ON DELETE rule (RESTRICT): listing_events.host_user_id (027) and
  //    booking_payments.recorded_by (031). Nulling them preserves the analytics
  //    and payment rows while unlinking the user. Migration 075 also sets these
  //    FKs to ON DELETE SET NULL — this is the pre-migration safety net and the
  //    reason a host with analytics/payment activity can be deleted at all.
  //    Best-effort: if a null fails, the auth delete below surfaces it as a 409.
  await adminClient
    .from("listing_events")
    .update({ host_user_id: null })
    .eq("host_user_id", host.user_id)
    .then(({ error: e }) => {
      if (e) console.error("Null listing_events.host_user_id failed:", e);
    });
  await adminClient
    .from("booking_payments")
    .update({ recorded_by: null })
    .eq("recorded_by", host.user_id)
    .then(({ error: e }) => {
      if (e) console.error("Null booking_payments.recorded_by failed:", e);
    });

  // 3. Auto-unassign every assigned listing (best-effort per listing). Sequential
  //    on purpose: each call mutates the same host doc's listings[] array, so
  //    parallel runs would race on that shared document.
  const listings = await getAssignedListings(hostRef).catch(() => []);
  for (const l of listings) {
    await unassignListingFromHost(hostRef, l._id).catch((err) =>
      console.error(`Unassign ${l._id} during delete failed:`, err)
    );
  }

  // 4. host_profiles — FK to auth.users with no cascade; nothing references it.
  const { error: profileErr } = await adminClient
    .from("host_profiles")
    .delete()
    .eq("id", id);
  if (profileErr) throw new Error(profileErr.message);

  // 5. auth user — last; cascades ON DELETE CASCADE children (properties, kitchen, etc.).
  //    With step 1/2 done its remaining references are cleared, so this should
  //    succeed. The error catch is a backstop: any residual non-cascade FK
  //    surfaces GoTrue's "Database error deleting user" / a 23503, which we map
  //    to a clear 409 rather than orphaning the auth user silently.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(
    host.user_id
  );
  if (authErr) {
    if (/foreign key|violat|23503|database error/i.test(authErr.message)) {
      throw new HostHasDependentDataError();
    }
    throw new Error(authErr.message);
  }

  // 6. Notifications (host.email captured before deletion).
  const resend = new Resend(process.env.RESEND_API_KEY);
  if (host.email) {
    await resend.emails
      .send({
        from: "Klickenya <hello@klickenya.com>",
        to: host.email,
        subject: "Your Klickenya host account has been closed",
        html: hostDeletedHtml({ name: host.display_name ?? "Host" }),
      })
      .catch(() => {});
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await resend.emails
      .send({
        from: "Klickenya <noreply@klickenya.com>",
        to: adminEmail,
        subject: `Admin: Host deleted — ${host.display_name}`,
        html: hostDeletedToAdminHtml({
          name: host.display_name ?? "Host",
          email: host.email ?? "",
        }),
      })
      .catch(() => {});
  }

  return { success: true, unassignedCount: listings.length };
}
