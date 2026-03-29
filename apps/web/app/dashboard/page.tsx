import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // Check if host needs to change password
  let showPasswordBanner = false;
  if (profile?.role === "host") {
    const { data: hostProfile } = await supabase
      .from("host_profiles")
      .select("password_changed")
      .eq("user_id", user.id)
      .single();

    showPasswordBanner = hostProfile?.password_changed === false;
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Password banner */}
        {showPasswordBanner && (
          <Link
            href="/reset-password"
            className="block mb-6 bg-[#FDF8F0] border border-[#E8A020] rounded-xl p-4 hover:bg-[#E8A020]/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-[#16130C]">
                  Please set a permanent password for your account
                </p>
                <p className="text-[13px] text-[#5E5848] mt-0.5">
                  You&apos;re using a temporary password. Change it to keep your
                  account secure.
                </p>
              </div>
              <span className="text-[#E8A020] font-bold text-sm shrink-0 ml-4">
                Change password →
              </span>
            </div>
          </Link>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
            Welcome, {profile?.full_name ?? "Host"}
          </h1>
          <p className="text-[14px] text-[#5E5848] mt-1">
            Manage your listings and account
          </p>
        </div>

        {/* Placeholder content */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white rounded-xl border border-[#E2DDD5] p-6">
            <h2 className="text-[16px] font-semibold text-[#16130C] mb-1">
              My listings
            </h2>
            <p className="text-[13px] text-[#9C9485]">
              Your listings will appear here once approved.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E2DDD5] p-6">
            <h2 className="text-[16px] font-semibold text-[#16130C] mb-1">
              Enquiries
            </h2>
            <p className="text-[13px] text-[#9C9485]">
              Guest enquiries for your listings will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
