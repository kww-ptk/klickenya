import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { EnquiryActions } from "./EnquiryActions";

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("user_id, sanity_host_id")
    .eq("user_id", user.id)
    .single();

  if (!hostProfile) redirect("/dashboard");

  // Fetch the enquiry
  const { data: request } = await adminClient
    .from("contact_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) notFound();

  // Fetch room name if room_id is present
  let roomName: string | null = null;
  if (request.room_id) {
    const { data: room } = await adminClient
      .from("rooms")
      .select("name")
      .eq("id", request.room_id)
      .single();
    roomName = room?.name ?? null;
  }

  // Verify ownership — via the Sanity listing OR via the owned property (resort
  // embed enquiries have no Sanity listing, only property_id). Deny access if
  // ownership can't be established, so a host can't open another host's enquiry
  // by guessing its id (Issue 3 — guest PII exposure).
  let owns = false;
  if (request.listing_sanity_id) {
    const ownerCheck = await sanityClient.fetch<string | null>(
      `*[_type == "listing" && _id == $listingId && (hostId == $hostId || host._ref == $sanityHostId)][0]._id`,
      {
        listingId: request.listing_sanity_id,
        hostId: hostProfile.user_id,
        sanityHostId: hostProfile.sanity_host_id ?? "",
      }
    );
    owns = !!ownerCheck;
  }
  if (!owns && request.property_id) {
    const { data: ownedProp } = await adminClient
      .from("properties")
      .select("id")
      .eq("id", request.property_id)
      .eq("owner_id", hostProfile.user_id)
      .maybeSingle();
    owns = !!ownedProp;
  }
  if (!owns) redirect("/dashboard/enquiries");

  // Parse notes for enquiry details and conversation history
  const notesStr = (request.notes as string) || "";
  const allBlocks = notesStr.split(/\n\n--- ((?:HOST )?REPLY|USER REPLY) \[/);
  const originalNotes = allBlocks[0] || "";

  const enquiryLines = originalNotes
    .split("\n")
    .filter((l) => !l.startsWith("Listing:") && !l.startsWith("Type:") && l.includes(": "))
    .map((l) => {
      const [key, ...rest] = l.split(": ");
      return [key.trim(), rest.join(": ").trim()] as [string, string];
    });

  // Parse conversation history
  const conversationParts = notesStr.split(/\n\n--- ((?:HOST )?REPLY|USER REPLY) \[/);
  const replyHistory: { date: string; status: string; subject: string; message: string; isUserReply: boolean }[] = [];

  for (let i = 1; i < conversationParts.length; i += 2) {
    const blockType = conversationParts[i];
    const block = conversationParts[i + 1] || "";
    const isUserReply = blockType === "USER REPLY";

    const dateMatch = block.match(/^(.+?)\] ---/);
    const statusMatch = block.match(/\nStatus: (.+)/);
    const subjectMatch = block.match(/\nSubject: (.+)/);
    const fromMatch = block.match(/\nFrom: (.+)/);
    const date = dateMatch?.[1] ?? "";
    const status = isUserReply ? "user-reply" : (statusMatch?.[1] ?? "info");
    const subject = subjectMatch?.[1] ?? "";

    const lines = block.split("\n");
    const headerPrefixes = ["] ---", "Status:", "Subject:", "From:"];
    let msgStartIdx = 0;
    for (let j = 0; j < lines.length; j++) {
      if (headerPrefixes.some((p) => lines[j].includes(p))) msgStartIdx = j + 1;
    }
    const message = lines.slice(msgStartIdx).join("\n").trim();

    replyHistory.push({
      date: date ? new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "",
      status,
      subject: isUserReply ? `Reply from ${fromMatch?.[1] || "guest"}` : subject,
      message,
      isUserReply,
    });
  }

  const guestName = request.full_name || "Guest";
  const listingTitle = request.listing_title || "";
  const listingType = request.listing_type || "";
  const date = new Date(request.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const time = new Date(request.created_at).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
  });

  const statusColors: Record<string, string> = {
    new: "bg-amber/10 text-amber",
    responded: "bg-[#22C55E]/10 text-[#22C55E]",
    converted: "bg-[#3B82F6]/10 text-[#3B82F6]",
    closed: "bg-text3/10 text-text3",
  };

  // Build WhatsApp link
  const whatsappNumber = request.phone?.replace(/[^0-9]/g, "") || "";
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi ${guestName}, thanks for your enquiry about ${listingTitle || "our listing"} on Klickenya!`)}`
    : null;

  return (
    <div>
      {/* Back */}
      <Link
        href="/dashboard/enquiries"
        className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-dark transition-colors mb-5"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to enquiries
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
            {guestName}
          </h1>
          <p className="text-[13px] text-text3 mt-0.5">{date} at {time}</p>
        </div>
        <span className={`px-3 py-1 text-[11px] font-bold uppercase rounded-full ${statusColors[request.status] || statusColors.new}`}>
          {request.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — details + actions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Request details */}
          <div className="bg-white rounded-xl border border-border p-5">
            {(listingTitle || listingType) && (
              <div className="mb-4 pb-4 border-b border-surface">
                <p className="text-[15px] font-semibold text-dark">{listingTitle}</p>
                {listingType && <p className="text-[12px] text-text3 capitalize mt-0.5">{listingType}</p>}
              </div>
            )}

            {request.message && (
              <div className="mb-4">
                <p className="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1">Message</p>
                <p className="text-[14px] text-dark leading-relaxed whitespace-pre-wrap">{request.message}</p>
              </div>
            )}

            {enquiryLines.length > 0 && (
              <div>
                <p className="text-[11px] text-text3 uppercase tracking-wider font-medium mb-2">Enquiry Details</p>
                <div className="space-y-1.5">
                  {enquiryLines.map(([key, value], i) => (
                    <div key={i} className="flex items-center gap-2 text-[13px]">
                      <span className="text-text3 shrink-0">{key}</span>
                      <span className="text-dark font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <EnquiryActions
            id={id}
            currentStatus={request.status}
            guestName={guestName}
            listingTitle={listingTitle}
            replyHistory={replyHistory}
          />
        </div>

        {/* Right column — quick contact */}
        <div className="space-y-5">
          {/* Booking request card — only for stay enquiries with dates */}
          {(request.check_in || request.check_out || request.calendar_status) && (() => {
            const fmtD = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
            const nights = request.check_in && request.check_out
              ? Math.max(1, Math.ceil((new Date(request.check_out + "T00:00:00").getTime() - new Date(request.check_in + "T00:00:00").getTime()) / 86400000))
              : null;

            // Parse estimated total from notes
            let estimatedTotal: number | null = null;
            if (request.notes) {
              const match = (request.notes as string).match(/"estimatedTotal"\s*:\s*(\d+)/);
              if (match) estimatedTotal = parseInt(match[1], 10);
            }

            const calBadge = request.calendar_status
              ? request.calendar_status === "pending"
                ? { label: "Pending", cls: "bg-amber/10 text-amber" }
                : request.calendar_status === "converted"
                  ? { label: "Converted", cls: "bg-green/10 text-green" }
                  : request.calendar_status === "declined"
                    ? { label: "Declined", cls: "bg-surface text-text3" }
                    : request.calendar_status === "held"
                      ? { label: "On hold", cls: "bg-[#EFF6FF] text-[#3B82F6]" }
                      : null
              : null;

            return (
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-bold text-dark">Booking Request</h2>
                  {calBadge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${calBadge.cls}`}>
                      {calBadge.label}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-[13px]">
                  {roomName && (
                    <div className="flex justify-between">
                      <span className="text-text3">Room</span>
                      <span className="text-dark font-medium">{roomName}</span>
                    </div>
                  )}
                  {request.check_in && (
                    <div className="flex justify-between">
                      <span className="text-text3">Check-in</span>
                      <span className="text-dark font-medium">{fmtD(request.check_in)}</span>
                    </div>
                  )}
                  {request.check_out && (
                    <div className="flex justify-between">
                      <span className="text-text3">Check-out</span>
                      <span className="text-dark font-medium">{fmtD(request.check_out)}</span>
                    </div>
                  )}
                  {nights && (
                    <div className="flex justify-between">
                      <span className="text-text3">Nights</span>
                      <span className="text-dark font-medium">{nights}</span>
                    </div>
                  )}
                  {request.guests && (
                    <div className="flex justify-between">
                      <span className="text-text3">Guests</span>
                      <span className="text-dark font-medium">{request.guests}</span>
                    </div>
                  )}
                  {estimatedTotal && (
                    <div className="flex justify-between border-t border-surface pt-2 mt-2">
                      <span className="text-text3">Estimated total</span>
                      <span className="font-bold text-amber">KSh {estimatedTotal.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Contact card */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-[15px] font-bold text-dark mb-4">Quick Contact</h2>
            <div className="space-y-2.5">
              <a
                href={`tel:${request.phone}`}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#22C55E]/10 text-[#22C55E] font-semibold text-[13px] hover:bg-[#22C55E]/20 transition-colors"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                Call {request.phone}
              </a>
              <a
                href={`mailto:${request.email}`}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-amber/10 text-amber font-semibold text-[13px] hover:bg-amber/20 transition-colors"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Email {request.email}
              </a>
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#25D366]/10 text-[#25D366] font-semibold text-[13px] hover:bg-[#25D366]/20 transition-colors"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Guest info */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-[15px] font-bold text-dark mb-3">Guest Info</h2>
            <div className="space-y-2 text-[13px]">
              <div>
                <p className="text-text3">Name</p>
                <p className="text-dark font-medium">{guestName}</p>
              </div>
              <div>
                <p className="text-text3">Email</p>
                <p className="text-dark font-medium">{request.email}</p>
              </div>
              <div>
                <p className="text-text3">Phone</p>
                <p className="text-dark font-medium">{request.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
