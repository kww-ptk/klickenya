"use client";

import { useState } from "react";

interface SettingsClientProps {
  userId: string;
}

export function SettingsClient({ userId }: SettingsClientProps) {
  const [emailOnEnquiry, setEmailOnEnquiry] = useState(true);
  const [emailOnReply, setEmailOnReply] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <h2 className="text-[15px] font-bold text-dark mb-4">Notifications</h2>
      <div className="space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-[13px] font-medium text-dark">New enquiry email</p>
            <p className="text-[12px] text-text3">Get an email when a guest contacts you</p>
          </div>
          <button
            onClick={() => setEmailOnEnquiry(!emailOnEnquiry)}
            className={`relative w-11 h-6 rounded-full transition-colors ${emailOnEnquiry ? "bg-amber" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${emailOnEnquiry ? "translate-x-5" : ""}`} />
          </button>
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-[13px] font-medium text-dark">Reply confirmation</p>
            <p className="text-[12px] text-text3">Get a copy when you reply to a guest</p>
          </div>
          <button
            onClick={() => setEmailOnReply(!emailOnReply)}
            className={`relative w-11 h-6 rounded-full transition-colors ${emailOnReply ? "bg-amber" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${emailOnReply ? "translate-x-5" : ""}`} />
          </button>
        </label>
      </div>
      <p className="text-[11px] text-text3 mt-4">
        Notification preferences are saved automatically. More options coming soon.
      </p>
    </div>
  );
}
