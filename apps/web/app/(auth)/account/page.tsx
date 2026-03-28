import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  // Hosts with a profile get plan info
  let hostProfile = null;
  if (profile?.role === "host") {
    const { data } = await supabase
      .from("host_profiles")
      .select("plan_tier, total_listings")
      .eq("user_id", user.id)
      .single();
    hostProfile = data;
  }

  return (
    <div className="w-full max-w-[520px] mx-4">
      <div className="bg-white rounded-[22px] shadow-lg p-8 md:p-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#6B2D8B] flex items-center justify-center">
            <span className="text-white font-bold text-[15px]">k</span>
          </div>
          <span className="text-[20px] font-bold tracking-[-0.03em] text-[#16130C]">
            klickenya
          </span>
        </div>

        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-center text-[#16130C] mb-8">
          My account
        </h1>

        {/* Profile info */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center py-3 border-b border-[#E2DDD5]">
            <span className="text-[13px] text-[#9C9485]">Name</span>
            <span className="text-[14px] font-medium text-[#16130C]">
              {profile?.full_name ?? "—"}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#E2DDD5]">
            <span className="text-[13px] text-[#9C9485]">Email</span>
            <span className="text-[14px] font-medium text-[#16130C]">
              {profile?.email ?? user.email}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#E2DDD5]">
            <span className="text-[13px] text-[#9C9485]">Account type</span>
            <span className="text-[14px] font-medium text-[#16130C] capitalize">
              {profile?.role ?? "guest"}
            </span>
          </div>
          {hostProfile && (
            <>
              <div className="flex justify-between items-center py-3 border-b border-[#E2DDD5]">
                <span className="text-[13px] text-[#9C9485]">Plan</span>
                <span className="text-[14px] font-medium text-[#16130C] capitalize">
                  {hostProfile.plan_tier}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[#E2DDD5]">
                <span className="text-[13px] text-[#9C9485]">Listings</span>
                <span className="text-[14px] font-medium text-[#16130C]">
                  {hostProfile.total_listings}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-4 mb-8">
          <div className="rounded-xl border border-[#E2DDD5] p-5">
            <h2 className="text-[15px] font-semibold text-[#16130C] mb-1">
              My enquiries
            </h2>
            <p className="text-[13px] text-[#9C9485]">
              Your enquiry history will appear here.
            </p>
          </div>
          <div className="rounded-xl border border-[#E2DDD5] p-5">
            <h2 className="text-[15px] font-semibold text-[#16130C] mb-1">
              My bookings
            </h2>
            <p className="text-[13px] text-[#9C9485]">
              Your booking history will appear here.
            </p>
          </div>
        </div>

        <SignOutButton />
      </div>
    </div>
  );
}
