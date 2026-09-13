import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { getEatMetrics } from "@/lib/eat/adminMetrics";

export const dynamic = "force-dynamic";

type MenuRow = {
  id: string;
  name: string;
  listing_slug: string | null;
  is_published: boolean | null;
  takeaway_enabled: boolean | null;
  delivery_enabled: boolean | null;
  table_ordering: boolean | null;
  whatsapp_phone: string | null;
};

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded-full mr-1 mb-1 ${
        on ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"
      }`}
    >
      {label}
    </span>
  );
}

/**
 * Every restaurant with a menu, and whether it can actually take an order.
 *
 * The point of this page is the blockers column. A restaurant can look live —
 * published, listed, delivery switched on — and still be unable to receive a
 * single order because nobody set a WhatsApp number. That is invisible
 * everywhere else.
 */
export default async function EatAdminRestaurants() {
  const m = await getEatMetrics(30);

  const { data: menuRows } = await adminClient
    .from("menus")
    .select(
      "id, name, listing_slug, is_published, takeaway_enabled, delivery_enabled, table_ordering, whatsapp_phone",
    )
    .order("name", { ascending: true });

  const menus = (menuRows ?? []) as MenuRow[];

  // Which of these actually resolve to a live listing. A menu whose
  // listing_slug matches nothing is orderable by nobody.
  const slugs = menus.map((x) => x.listing_slug).filter(Boolean) as string[];
  const known = new Set<string>(
    slugs.length
      ? await sanityClient.fetch<string[]>(
          `*[_type == "listing" && slug.current in $slugs].slug.current`,
          { slugs },
        )
      : [],
  );

  const orderCount = new Map<string, number>();
  for (const o of m.orders) orderCount.set(o.menu_id, (orderCount.get(o.menu_id) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-zinc-500">
        {menus.length} menus. &ldquo;Blockers&rdquo; are the reasons a restaurant cannot take an
        order right now.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-[13.5px] min-w-[900px]">
          <thead className="bg-zinc-50 text-left">
            <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-semibold">Restaurant</th>
              <th className="px-4 py-3 font-semibold">Channels</th>
              <th className="px-4 py-3 font-semibold">WhatsApp</th>
              <th className="px-4 py-3 font-semibold">Orders 30d</th>
              <th className="px-4 py-3 font-semibold">Blockers</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((x) => {
              const ordering = Boolean(
                x.delivery_enabled || x.takeaway_enabled || x.table_ordering,
              );
              const online = Boolean(x.delivery_enabled || x.takeaway_enabled);
              const blockers: string[] = [];
              if (!x.is_published) blockers.push("menu not published");
              if (!x.listing_slug) blockers.push("no listing linked");
              else if (!known.has(x.listing_slug)) blockers.push("listing slug matches nothing");
              if (!ordering) blockers.push("no ordering channel on");
              if (online && !x.whatsapp_phone) blockers.push("no WhatsApp number");

              return (
                <tr key={x.id} className="border-t border-zinc-100 align-top">
                  <td className="px-4 py-3">
                    <span className="font-bold text-zinc-900">
                      {String(x.name ?? "").replace(/\s+menu\s*$/i, "").trim() || x.name}
                    </span>
                    {x.listing_slug && (
                      <Link
                        href={`/m/${x.listing_slug}`}
                        className="block text-[12px] text-zinc-500 underline"
                      >
                        /m/{x.listing_slug}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Flag on={!!x.delivery_enabled} label="delivery" />
                    <Flag on={!!x.takeaway_enabled} label="takeaway" />
                    <Flag on={!!x.table_ordering} label="table" />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                    {x.whatsapp_phone ?? <span className="text-red-600 font-medium">not set</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{orderCount.get(x.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    {blockers.length === 0 ? (
                      <span className="text-[12px] font-bold text-emerald-700">ready</span>
                    ) : (
                      <ul className="text-[12px] text-red-600 space-y-0.5">
                        {blockers.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[12.5px] text-zinc-400">
        Settings are changed by the restaurant owner in their own command center — this page
        shows the state, so a restaurant that looks live but cannot be ordered from is visible
        rather than silent.
      </p>
    </div>
  );
}
