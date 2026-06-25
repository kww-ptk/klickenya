import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { adminClient } from "@/lib/supabase/admin";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { setNotificationEmailForAssignedListings } from "@/lib/admin/hostListings";
import {
  hostEmailChangedHtml,
  hostPasswordChangedHtml,
  hostUpdatedToAdminHtml,
} from "@/lib/email/hostEmails";

/** Thrown when a new email collides with an existing account; mapped to HTTP 409. */
export class HostEmailConflictError extends Error {
  constructor(message = "That email is already in use by another account") {
    super(message);
    this.name = "HostEmailConflictError";
  }
}

export interface UpdateHostInput {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  /** Optional — when present, the auth password is reset to this value. */
  password?: string | null;
}

export async function updateHostAccount(
  input: UpdateHostInput
): Promise<{ success: true }> {
  const { id, name, phone } = input;
  const email = input.email.trim();
  const password = input.password?.trim() || null;

  const { data: host, error: loadErr } = await adminClient
    .from("host_profiles")
    .select("id, user_id, display_name, email, phone, sanity_host_id")
    .eq("id", id)
    .single();

  if (loadErr || !host) {
    throw new Error("Host not found");
  }

  const emailChanged =
    email.toLowerCase() !== (host.email ?? "").toLowerCase();
  const passwordChanged = !!password;
  const nameChanged = name !== host.display_name;
  const phoneChanged = (phone ?? null) !== (host.phone ?? null);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // --- 1. auth.users (email and/or password). Runs first so a colliding
  //         email fails here before any DB rows are touched. ---
  if (emailChanged || passwordChanged) {
    const updates: {
      email?: string;
      password?: string;
      email_confirm?: boolean;
    } = {};
    if (emailChanged) {
      updates.email = email;
      updates.email_confirm = true;
    }
    if (passwordChanged) {
      updates.password = password!;
    }
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      host.user_id,
      updates
    );
    if (authErr) {
      if (/already|registered|exists|duplicate/i.test(authErr.message)) {
        throw new HostEmailConflictError();
      }
      throw new Error(authErr.message);
    }
  }

  // --- 2. public.users ---
  const { error: usersErr } = await adminClient
    .from("users")
    .update({ email, full_name: name })
    .eq("id", host.user_id);
  if (usersErr) {
    if (usersErr.code === "23505") throw new HostEmailConflictError();
    throw new Error(usersErr.message);
  }

  // --- 3. host_profiles ---
  const profileUpdate: Record<string, unknown> = {
    display_name: name,
    email,
    phone: phone ?? null,
  };
  if (passwordChanged) profileUpdate.password_changed = false;

  const { error: profileErr } = await adminClient
    .from("host_profiles")
    .update(profileUpdate)
    .eq("id", id);
  if (profileErr) {
    if (profileErr.code === "23505") throw new HostEmailConflictError();
    throw new Error(profileErr.message);
  }

  // --- 4. Sanity host doc email (best-effort) ---
  if (emailChanged && host.sanity_host_id) {
    await sanityWriteClient
      .patch(host.sanity_host_id)
      .set({ email })
      .commit()
      .catch((err) => console.error("Update Sanity host email error:", err));
  }

  // --- 5. notificationEmail1 on assigned listings (best-effort) ---
  if (emailChanged) {
    await setNotificationEmailForAssignedListings(
      { user_id: host.user_id, sanity_host_id: host.sanity_host_id },
      email
    ).catch((err) =>
      console.error("Update listing notification emails error:", err)
    );
  }

  // --- 6. Notifications ---
  const resend = new Resend(process.env.RESEND_API_KEY);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
  const loginUrl = `${siteUrl}/login`;

  if (emailChanged) {
    await resend.emails
      .send({
        from: "Klickenya <hello@klickenya.com>",
        to: email,
        subject: "Your Klickenya login email has changed",
        html: hostEmailChangedHtml({ name, newEmail: email, loginUrl }),
      })
      .catch(() => {});
  }

  if (passwordChanged) {
    await resend.emails
      .send({
        from: "Klickenya <hello@klickenya.com>",
        to: email,
        subject: "Your Klickenya password has changed",
        html: hostPasswordChangedHtml({ name, loginUrl }),
      })
      .catch(() => {});
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (
    adminEmail &&
    (emailChanged || passwordChanged || nameChanged || phoneChanged)
  ) {
    const changes: string[] = [];
    if (nameChanged) changes.push("name");
    if (emailChanged) changes.push("email");
    if (passwordChanged) changes.push("password");
    if (phoneChanged) changes.push("phone");
    await resend.emails
      .send({
        from: "Klickenya <noreply@klickenya.com>",
        to: adminEmail,
        subject: `Admin: Host updated — ${name}`,
        html: hostUpdatedToAdminHtml({
          name,
          email,
          changes,
          hostProfileId: id,
        }),
      })
      .catch(() => {});
  }

  return { success: true };
}
