import { adminClient } from "@/lib/supabase/admin";
import { DeleteButton } from "../_components/DeleteButton";

interface Subscriber {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
}

export const dynamic = "force-dynamic";

export default async function NewsletterSubscribersPage() {
  const { data: subscribers, error } = await adminClient
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false });

  const subs = (subscribers ?? []) as Subscriber[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">Subscribers</h1>
            <span className="text-[12px] font-semibold text-text3 bg-[#F0EDE8] px-2 py-0.5 rounded-full">{subs.length}</span>
          </div>
          <p className="text-[13px] text-text3 mt-1">Newsletter email list — view, search, and export all subscribers.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-700">
          Failed to load subscribers: {error.message}
        </div>
      )}

      {subs.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <p className="text-text3 text-sm">No subscribers yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas">
                <th className="text-left px-5 py-3 font-semibold text-text2 text-[12px] uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-5 py-3 font-semibold text-text2 text-[12px] uppercase tracking-wider">
                  Source
                </th>
                <th className="text-left px-5 py-3 font-semibold text-text2 text-[12px] uppercase tracking-wider">
                  Date
                </th>
                <th className="text-right px-5 py-3 font-semibold text-text2 text-[12px] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-surface last:border-0 hover:bg-canvas transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium text-dark">
                    {sub.email}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface text-text2">
                      {sub.source ?? "website"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-text3">
                    {new Date(sub.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <DeleteButton
                      table="newsletter_subscribers"
                      id={sub.id}
                    />
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
