import Link from "next/link";
import { SettingsClient } from "./SettingsClient";

interface AccountSettingsProps {
  email: string;
  role: string;
  passwordChanged: boolean;
  userId: string;
}

export function AccountSettings({
  email,
  role,
  passwordChanged,
  userId,
}: AccountSettingsProps) {
  return (
    <div className="space-y-5 max-w-[600px] mt-10">
      <div>
        <h2 className="font-display text-[20px] font-bold tracking-[-0.02em] text-dark">
          Account &amp; settings
        </h2>
        <p className="text-[13px] text-text3 mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-[15px] font-bold text-dark mb-4">Account</h3>
        <div className="space-y-3 text-[13px]">
          <div className="flex items-center justify-between py-2 border-b border-surface">
            <span className="text-text3">Email</span>
            <span className="text-dark font-medium">{email || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text3">Role</span>
            <span className="text-dark font-medium capitalize">{role || "guest"}</span>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-[15px] font-bold text-dark mb-2">Password</h3>
        {!passwordChanged ? (
          <div>
            <p className="text-[13px] text-text3 mb-3">
              You signed up via a claim link. Set a password to secure your account.
            </p>
            <Link
              href="/reset-password"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-amber text-white text-[13px] font-semibold hover:bg-[#d4911c] transition-colors"
            >
              Set password
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-text3 mb-3">Change your account password.</p>
            <Link
              href="/reset-password"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-dark text-white text-[13px] font-semibold hover:bg-[#2A2520] transition-colors"
            >
              Change password
            </Link>
          </div>
        )}
      </div>

      {/* Notification preferences */}
      <SettingsClient userId={userId} />

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <h3 className="text-[15px] font-bold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-[13px] text-text3 mb-3">
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
  );
}
