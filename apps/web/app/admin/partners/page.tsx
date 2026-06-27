import Link from "next/link";
import { sanityClient } from "@/lib/sanity/client";
import { ADMIN_PARTNERS_QUERY } from "@/lib/partner/adminQueries";

export const revalidate = 0;

interface PartnerRow {
  _id: string;
  name: string;
  slug: string;
  domains?: string[];
  logoUrl?: string;
  enabledModules?: string[];
  listingCount: number;
}

export default async function AdminPartnersPage() {
  const partners = await sanityClient.fetch<PartnerRow[]>(ADMIN_PARTNERS_QUERY);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[28px] font-bold text-dark">Partners</h1>
            <span className="text-[12px] font-semibold text-text3 bg-[#F0EDE8] px-2 py-0.5 rounded-full">{partners.length}</span>
          </div>
          <p className="text-[13px] text-text3 mt-1">Partner sites with custom branding and theming applied to their host dashboard.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/partners/new"
            className="px-4 py-2 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors"
          >
            + Create Partner Site
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        {partners.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13px] text-text3">
            No partner sites yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#F0EDE8] text-text3">
                  <th className="px-6 py-3 font-medium">Partner</th>
                  <th className="px-6 py-3 font-medium">Storefront</th>
                  <th className="px-6 py-3 font-medium">Domains</th>
                  <th className="px-6 py-3 font-medium">Modules</th>
                  <th className="px-6 py-3 font-medium">Listings</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE8]">
                {partners.map((p) => (
                  <tr key={p._id} className="hover:bg-[#F7F5F2] transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {p.logoUrl ? (
                          <img
                            src={`${p.logoUrl}?w=64&h=64&fit=crop&auto=format`}
                            alt=""
                            className="size-8 rounded-lg object-cover border border-border"
                          />
                        ) : (
                          <div className="size-8 rounded-lg bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[11px] font-bold">
                            {(p.name ?? "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-dark">{p.name}</span>
                          <span className="block text-[11px] text-text3">{p.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <a
                        href={`${site}/w/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber hover:underline"
                      >
                        /w/{p.slug} ↗
                      </a>
                    </td>
                    <td className="px-6 py-3 text-text3">
                      {p.domains && p.domains.length > 0
                        ? p.domains.join(", ")
                        : <span className="text-text3/50">—</span>}
                    </td>
                    <td className="px-6 py-3">
                      {p.enabledModules && p.enabledModules.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.enabledModules.map((m) => (
                            <span
                              key={m}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber/10 text-amber text-[10px] font-semibold"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text3/50">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-semibold text-dark">{p.listingCount}</span>
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/partners/${p._id}/edit`}
                        className="text-amber font-medium hover:underline"
                      >
                        Edit →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
