import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { ExportCSVButton } from "./ExportCSVButton";

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  joined_at: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AttendeesPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify this event belongs to the host
  const { data: event } = await supabase
    .from("events_pending")
    .select("id, title, sanity_event_id, host_id")
    .eq("id", id)
    .eq("host_id", user.id)
    .single();

  if (!event) notFound();

  // Fetch attendees
  const { data: attendees } = await adminClient
    .from("event_attendees")
    .select("*")
    .eq("event_sanity_id", event.sanity_event_id)
    .order("joined_at", { ascending: false });

  const rows = (attendees ?? []) as Attendee[];
  const confirmed = rows.filter((r) => r.status === "confirmed");
  const cancelled = rows.filter((r) => r.status === "cancelled");

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text2 hover:text-text transition-colors mb-6"
      >
        <ArrowLeft className="size-3.5" />
        Back to My Events
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-[clamp(20px,3vw,28px)] font-bold text-text tracking-[-0.03em]">
            Attendees
          </h1>
          <p className="text-text2 text-[14px] mt-1">
            {event.title} · {confirmed.length} confirmed
          </p>
        </div>
        {confirmed.length > 0 && (
          <ExportCSVButton attendees={confirmed} eventTitle={event.title} />
        )}
      </div>

      {/* Attendee list */}
      {rows.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#E2DDD5] bg-white p-12 text-center">
          <Users className="size-10 text-[#9C9485] mx-auto mb-3" />
          <p className="text-[16px] font-semibold text-text mb-1">
            No attendees yet
          </p>
          <p className="text-[13px] text-text2 max-w-[320px] mx-auto">
            Share your event to start getting people to join.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E2DDD5] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface text-[12px] font-semibold text-text2 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 hidden md:table-cell">Email</th>
                <th className="px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD5]">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[14px] font-medium text-text">{a.name}</p>
                    <p className="text-[12px] text-text2 md:hidden">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-text2 hidden md:table-cell">
                    {a.email}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-text2 hidden md:table-cell">
                    {a.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      a.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-text2 hidden md:table-cell">
                    {new Date(a.joined_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
