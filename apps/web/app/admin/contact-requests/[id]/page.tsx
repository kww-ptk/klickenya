import { adminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ContactRequestActions } from "./ContactRequestActions";

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

export default async function ContactRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: request } = await adminClient
    .from("contact_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) notFound();

  /* Parse listing info and enquiry details from the notes field */
  const notesStr = (request.notes as string) || "";
  const listingMatch = notesStr.match(/^Listing: (.+?)(?:\s*\(.*?\))?\s*$/m);
  const typeMatch = notesStr.match(/^Type: (.+)$/m);
  const parsedListing = listingMatch?.[1] ?? null;
  const parsedType = typeMatch?.[1] ?? null;
  const enquiryLines = notesStr
    .split("\n")
    .filter((l) => !l.startsWith("Listing:") && !l.startsWith("Type:") && l.includes(": "))
    .map((l) => {
      const [key, ...rest] = l.split(": ");
      return [key, rest.join(": ")] as [string, string];
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/contact-requests"
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
            Contact Request
          </h1>
          <p className="text-[14px] text-[#9C9485] mt-1">
            from {request.full_name || "Unknown"} &middot;{" "}
            {formatDate(request.created_at)}
          </p>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request details card */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
            <h2 className="text-[18px] font-display font-bold text-[#16130C]">
              Request Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Listing
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {parsedListing || "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Listing Type
                </p>
                <p className="text-[14px] text-[#16130C] capitalize">
                  {parsedType || "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Name
                </p>
                <p className="text-[14px] text-[#16130C] font-medium">
                  {request.full_name || "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Email
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {request.email ? (
                    <a
                      href={`mailto:${request.email}`}
                      className="text-[#E8A020] hover:underline"
                    >
                      {request.email}
                    </a>
                  ) : (
                    "\u2014"
                  )}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Phone
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {request.phone ? (
                    <a
                      href={`tel:${request.phone}`}
                      className="text-[#E8A020] hover:underline"
                    >
                      {request.phone}
                    </a>
                  ) : (
                    "\u2014"
                  )}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Status
                </p>
                <StatusBadge status={request.status || "new"} />
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Submitted
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {formatDate(request.created_at)}
                </p>
              </div>
            </div>

            {/* Message */}
            {request.message && (
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-2">
                  Message
                </p>
                <div className="bg-[#F7F5F2] rounded-xl p-4 text-[14px] text-[#16130C] leading-relaxed whitespace-pre-wrap">
                  {request.message}
                </div>
              </div>
            )}

            {/* Enquiry Details (parsed from notes) */}
            {enquiryLines.length > 0 && (
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-2">
                  Enquiry Details
                </p>
                <div className="bg-[#F7F5F2] rounded-xl p-4 space-y-2">
                  {enquiryLines.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start gap-3 text-[14px]"
                    >
                      <span className="text-[#9C9485] capitalize min-w-[120px] shrink-0">
                        {key}
                      </span>
                      <span className="text-[#16130C]">
                        {value || "\u2014"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {request.notes && (
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-2">
                  Notes
                </p>
                <div className="bg-[#F7F5F2] rounded-xl p-4 text-[14px] text-[#16130C] leading-relaxed whitespace-pre-wrap">
                  {request.notes}
                </div>
              </div>
            )}
          </div>

          {/* Actions (client component) */}
          <ContactRequestActions
            id={id}
            currentStatus={request.status || "new"}
            currentNotes={request.notes || ""}
          />
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <h2 className="text-[18px] font-display font-bold text-[#16130C]">
              Status
            </h2>
            <div className="flex items-center gap-2">
              <StatusBadge status={request.status || "new"} />
            </div>
            <div className="pt-2 space-y-2">
              {request.status !== "responded" && (
                <form>
                  <input type="hidden" name="status" value="responded" />
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-[13px] font-medium rounded-lg bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 transition-colors"
                    disabled
                  >
                    Mark Responded
                  </button>
                </form>
              )}
              {request.status !== "converted" && (
                <button
                  type="button"
                  className="w-full px-4 py-2 text-[13px] font-medium rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20 transition-colors"
                  disabled
                >
                  Mark Converted
                </button>
              )}
              {request.status !== "closed" && (
                <button
                  type="button"
                  className="w-full px-4 py-2 text-[13px] font-medium rounded-lg bg-[#9C9485]/10 text-[#9C9485] hover:bg-[#9C9485]/20 transition-colors"
                  disabled
                >
                  Mark Closed
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#9C9485]">
              Use the actions panel below to update status.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-3">
            <h2 className="text-[18px] font-display font-bold text-[#16130C]">
              Quick Actions
            </h2>
            <Link
              href="/admin/contact-requests"
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
              Back to all requests
            </Link>
            {request.email && (
              <a
                href={`mailto:${request.email}`}
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
                Email {request.full_name || "guest"}
              </a>
            )}
            {request.phone && (
              <a
                href={`tel:${request.phone}`}
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
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
                Call {request.full_name || "guest"}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
