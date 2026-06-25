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

  // 1. Auto-unassign every assigned listing (best-effort per listing).
  const listings = await getAssignedListings(hostRef).catch(() => []);
  for (const l of listings) {
    await unassignListingFromHost(hostRef, l._id).catch((err) =>
      console.error(`Unassign ${l._id} during delete failed:`, err)
    );
  }

  // 2. host_profiles — FK to auth.users with no cascade, so delete before the auth user.
  const { error: profileErr } = await adminClient
    .from("host_profiles")
    .delete()
    .eq("id", id);
  if (profileErr) throw new Error(profileErr.message);

  // 3. public.users — FK to auth.users with no cascade.
  const { error: usersErr } = await adminClient
    .from("users")
    .delete()
    .eq("id", host.user_id);
  if (usersErr) throw new Error(usersErr.message);

  // 4. auth user — last; cascades ON DELETE CASCADE children (properties, kitchen, etc.).
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(
    host.user_id
  );
  if (authErr) throw new Error(authErr.message);

  // 5. Notifications (host.email captured before deletion).
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
