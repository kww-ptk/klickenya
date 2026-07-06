import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getAuthUser, getHostProfile } from "../_lib/auth";

export const dynamic = "force-dynamic";

type Contact = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string | null;
  created_at: string;
};
type Subscriber = { id: string; email: string; created_at: string };

// Strip the "[Partner] " source tag from a subject for display.
function cleanSubject(subject: string | null): string {
  if (!subject) return "(no subject)";
  return subject.replace(/^\[[^\]]+\]\s*/, "").trim() || "(no subject)";
}

export default async function MessagesPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile) redirect("/dashboard");

  // The host's partner tag (set at partner onboarding). Their website's
  // contact/newsletter submissions are tagged with this same value.
  const { data: hp } = await adminClient
    .from("host_profiles")
    .select("partner_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const partnerId = hp?.partner_id ?? null;

  let contacts: Contact[] = [];
  let subscribers: Subscriber[] = [];

  if (partnerId) {
    const [c, s] = await Promise.all([
      adminClient
        .from("general_contacts")
        .select("id, name, email, subject, message, created_at")
        .ilike("subject", `[${partnerId}]%`)
        .order("created_at", { ascending: false })
        .limit(100),
      adminClient
        .from("newsletter_subscribers")
        .select("id, email, created_at")
        .eq("source", partnerId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    contacts = c.data ?? [];
    subscribers = s.data ?? [];
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
          Messages
        </h1>
        <p className="text-[13px] text-text3 mt-0.5">
          Contact-form messages, enquiries, and newsletter signups from your website.
        </p>
      </div>

      {!partnerId ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
          <p className="font-display text-[18px] font-bold text-dark mb-1">No website connected</p>
          <p className="text-[14px] text-text3 max-w-[320px] mx-auto">
            Once your website is connected to Klickenya, contact messages and newsletter
            signups will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Contact messages / leads */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[15px] font-bold text-dark">Contact messages &amp; leads</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber/10 text-amber">
                {contacts.length}
              </span>
            </div>
            {contacts.length === 0 ? (
              <div className="bg-white rounded-xl border border-border p-8 text-center shadow-sm">
                <p className="text-[14px] text-text3">No messages yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white rounded-xl lg:rounded-2xl border border-border p-4 lg:p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-dark truncate">{m.name}</p>
                        <p className="text-[12px] text-dark/70 font-medium mt-0.5">
                          {cleanSubject(m.subject)}
                        </p>
                        {m.message && (
                          <p className="text-[13px] text-text2 mt-1.5 whitespace-pre-wrap line-clamp-4">
                            {m.message}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          <span className="text-[12px] text-text3">{m.email}</span>
                          <a
                            href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + cleanSubject(m.subject))}`}
                            className="inline-flex items-center gap-1 text-[12px] text-amber font-semibold hover:underline"
                          >
                            Reply
                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </a>
                        </div>
                      </div>
                      <p className="text-[11px] text-text3 shrink-0">{fmt(m.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Newsletter subscribers */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[15px] font-bold text-dark">Newsletter subscribers</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber/10 text-amber">
                {subscribers.length}
              </span>
            </div>
            {subscribers.length === 0 ? (
              <div className="bg-white rounded-xl border border-border p-8 text-center shadow-sm">
                <p className="text-[14px] text-text3">No subscribers yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl lg:rounded-2xl border border-border shadow-sm divide-y divide-surface">
                {subscribers.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 lg:px-5 py-3">
                    <a href={`mailto:${s.email}`} className="text-[13px] text-dark font-medium hover:text-amber truncate">
                      {s.email}
                    </a>
                    <span className="text-[11px] text-text3 shrink-0 ml-3">{fmt(s.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
