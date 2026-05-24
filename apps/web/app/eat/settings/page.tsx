import Link from "next/link";

/**
 * /eat/settings — placeholder. Account-level settings (profile, password,
 * plan, billing) shared with the legacy dashboard.
 */
export default function EatSettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
          Settings
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-0.5">
          Account, profile, plan — shared with the legacy dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/dashboard/profile/edit"
          className="flex items-center gap-3 bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#16130C]">Profile</p>
            <p className="text-[11px] text-[#9C9485] truncate">Display name, contact details, photo</p>
          </div>
          <span className="text-[#9C9485] text-[16px] shrink-0">›</span>
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 shadow-sm hover:shadow-md hover:border-[#E8A020]/40 transition-all"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#16130C]">Account & plan</p>
            <p className="text-[11px] text-[#9C9485] truncate">Subscription, password, notifications</p>
          </div>
          <span className="text-[#9C9485] text-[16px] shrink-0">›</span>
        </Link>
      </div>
    </div>
  );
}
