import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { hostWelcomeHtml, hostCreatedToAdminHtml } from "@/lib/email/hostEmails";

const resend = new Resend(process.env.RESEND_API_KEY);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    await assertAdmin(request);
    const { name, email, phone } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: "name and email are required" }, { status: 400 });
    }

    // Generate temp password
    const tempPassword = `Welcome${Math.floor(1000 + Math.random() * 9000)}`;
    const slug = slugify(name);

    // Create auth user with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message ?? "Failed to create user" }, { status: 500 });
    }

    const userId = authData.user.id;

    // Set role to host in users table
    await adminClient
      .from("users")
      .update({ role: "host", full_name: name })
      .eq("id", userId);

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
      })
      .select("id")
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Generate magic link (24h)
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    const magicLink = linkData?.properties?.action_link ?? `https://klickenya.com/login`;

    // Email to new host
    await resend.emails.send({
      from: "Klickenya <hello@klickenya.com>",
      to: email,
      subject: "Welcome to Klickenya — your host account is ready",
      html: hostWelcomeHtml({ name, email, magicLink }),
    }).catch((err) => console.error("Welcome email error:", err));

    // Email to admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await resend.emails.send({
        from: "Klickenya <hello@klickenya.com>",
        to: adminEmail,
        subject: `Admin: New host created — ${name}`,
        html: hostCreatedToAdminHtml({
          name,
          email,
          phone: phone ?? "—",
          slug,
          hostProfileId: hostProfile.id,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, hostId: hostProfile.id, slug }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Create host error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
