import { adminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GeneralContactActions } from "./GeneralContactActions";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function GeneralContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: contact } = await adminClient
    .from("general_contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/general-contacts"
          className="flex items-center gap-1.5 text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to list
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold text-[#16130C]">
            Contact Message
          </h1>
          <p className="text-[14px] text-[#9C9485] mt-1">
            from {contact.name || "Unknown"} &middot;{" "}
            {formatDate(contact.created_at)}
          </p>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Message details card */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
            <h2 className="text-[18px] font-display font-bold text-[#16130C]">
              Message Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Name
                </p>
                <p className="text-[14px] text-[#16130C] font-medium">
                  {contact.name || "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Email
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-[#E8A020] hover:underline"
                    >
                      {contact.email}
                    </a>
                  ) : (
                    "\u2014"
                  )}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Subject
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {contact.subject || "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Submitted
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {formatDate(contact.created_at)}
                </p>
              </div>
            </div>

            {/* Message */}
            {contact.message && (
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-2">
                  Message
                </p>
                <div className="bg-[#F7F5F2] rounded-xl p-4 text-[14px] text-[#16130C] leading-relaxed whitespace-pre-wrap">
                  {contact.message}
                </div>
              </div>
            )}
          </div>

          {/* Actions (client component) */}
          <GeneralContactActions
            id={id}
            originalSubject={contact.subject || ""}
          />
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-3">
            <h2 className="text-[18px] font-display font-bold text-[#16130C]">
              Quick Actions
            </h2>
            <Link
              href="/admin/general-contacts"
              className="flex items-center gap-2 text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
            >
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                />
              </svg>
              Back to all contacts
            </Link>
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
              >
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                Email {contact.name || "sender"}
              </a>
            )}
            {contact.email && contact.subject && (
              <a
                href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`}
                className="flex items-center gap-2 text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
              >
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                  />
                </svg>
                Reply via email
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
