import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("display_name, email, phone, city, website_url, social_url, password_changed")
    .eq("user_id", user.id)
    .single();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
          Settings
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-5 max-w-[600px]">
        {/* Account info */}
        <div className="bg-white rounded-xl border border-[#E2DDD5] p-5">
          <h2 className="text-[15px] font-bold text-[#16130C] mb-4">Account</h2>
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between py-2 border-b border-[#F4F1EC]">
              <span className="text-[#9C9485]">Email</span>
              <span className="text-[#16130C] font-medium">{profile?.email ?? user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#F4F1EC]">
              <span className="text-[#9C9485]">Name</span>
              <span className="text-[#16130C] font-medium">{hostProfile?.display_name ?? profile?.full_name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#F4F1EC]">
              <span className="text-[#9C9485]">Role</span>
              <span className="text-[#16130C] font-medium capitalize">{profile?.role ?? "guest"}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[#9C9485]">Phone</span>
              <span className="text-[#16130C] font-medium">{hostProfile?.phone ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="bg-white rounded-xl border border-[#E2DDD5] p-5">
          <h2 className="text-[15px] font-bold text-[#16130C] mb-2">Password</h2>
          {hostProfile?.password_changed === false ? (
            <div>
              <p className="text-[13px] text-[#9C9485] mb-3">
                You signed up via a claim link. Set a password to secure your account.
              </p>
              <Link
                href="/reset-password"
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-[#E8A020] text-white text-[13px] font-semibold hover:bg-[#d4911c] transition-colors"
              >
                Set password
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-[13px] text-[#9C9485] mb-3">
                Change your account password.
              </p>
              <Link
                href="/reset-password"
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-[#16130C] text-white text-[13px] font-semibold hover:bg-[#2A2520] transition-colors"
              >
                Change password
              </Link>
            </div>
          )}
        </div>

        {/* Notification preferences */}
        <SettingsClient userId={user.id} />

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <h2 className="text-[15px] font-bold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-[13px] text-[#9C9485] mb-3">
            Contact support to delete your account and all associated data.
          </p>
          <a
            href="mailto:hello@klickenya.com?subject=Delete my account"
            className="inline-flex items-center px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-[13px] font-semibold hover:bg-red-50 transition-colors"
          >
            Request account deletion
          </a>
        </div>
      </div>
    </div>
  );
}
