import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { adminClient } from "@/lib/supabase/admin";
import { hostWelcomeHtml, hostCreatedToAdminHtml } from "@/lib/email/hostEmails";

export interface CreateHostInput {
  name: string;
  email: string;
  phone?: string | null;
  partnerId?: string | null; // white-label linkage → host_profiles.partner_id
}

export interface CreateHostResult {
  userId: string;
  hostId: string;
  slug: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createHostAccount(
  input: CreateHostInput
): Promise<CreateHostResult> {
  const { name, email, phone, partnerId } = input;

  // Generate temp password
  const tempPassword = `Welcome${Math.floor(1000 + Math.random() * 9000)}`;
  const slug = slugify(name);

  // Create auth user with service role
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Failed to create user");
  }

  const userId = authData.user.id;

  // Upsert the users row — auth.admin.createUser() does NOT auto-create
  // a public.users row, so update() would silently fail on a new account.
  await adminClient
    .from("users")
    .upsert(
      { id: userId, email, full_name: name, role: "host" },
      { onConflict: "id" }
    );

  // Create host_profiles row
  const { data: hostProfile, error: profileError } = await adminClient
    .from("host_profiles")
    .insert({
      user_id: userId,
      display_name: name,
      email,
      phone: phone ?? null,
      slug,
      password_changed: false,
      partner_id: partnerId ?? null,
    })
    .select("id")
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  // Generate magic link (24h) with explicit redirect so the link
  // always lands on the correct domain regardless of Supabase Site URL setting.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });

  const magicLink =
    linkData?.properties?.action_link ?? `https://klickenya.com/login`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Email to new host
  await resend.emails
    .send({
      from: "Klickenya <hello@klickenya.com>",
      to: email,
      subject: "Welcome to Klickenya — your host account is ready",
      html: hostWelcomeHtml({ name, email, magicLink }),
    })
    .catch((err) => console.error("Welcome email error:", err));

  // Email to admin
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await resend.emails
      .send({
        from: "Klickenya <noreply@klickenya.com>",
        to: adminEmail,
        subject: `Admin: New host created — ${name}`,
        html: hostCreatedToAdminHtml({
          name,
          email,
          phone: phone ?? "—",
          slug,
          hostProfileId: hostProfile.id,
        }),
      })
      .catch(() => {});
  }

  return { userId, hostId: hostProfile.id, slug };
}
