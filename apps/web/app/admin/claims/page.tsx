import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteButton } from "../_components/DeleteButton";

export const revalidate = 0;

type ClaimRequest = {
  id: string;
  listing_title: string;
  listing_type: string;
  listing_city: string | null;
  claimant_name: string;
  claimant_email: string;
  status: string;
  created_at: string;
  verified_at: string | null;
};

export default async function AdminClaimsPage() {
  const { data: claims } = await adminClient
    .from("claim_requests")
    .select("id, listing_title, listing_type, listing_city, claimant_name, claimant_email, status, created_at, verified_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const allClaims = (claims ?? []) as ClaimRequest[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-bold text-[#16130C]">
          Claim Requests
        </h1>
        <span className="text-sm text-[#9C9485]">{allClaims.length} total</span>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        {allClaims.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13px] text-[#9C9485]">
            No claim requests yet.
          </p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#F0EDE8] text-[#9C9485]">
                <th className="px-6 py-3 font-medium">Listing</th>
                <th className="px-6 py-3 font-medium">Claimant</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE8]">
              {allClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-[#F7F5F2] transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-[#16130C] truncate max-w-[200px]">{claim.listing_title}</p>
                    <p className="text-[11px] text-[#9C9485]">{claim.listing_type} · {claim.listing_city ?? "—"}</p>
                  </td>
                  <td className="px-6 py-3 text-[#16130C]">{claim.claimant_name}</td>
                  <td className="px-6 py-3 text-[#9C9485]">{claim.claimant_email}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={claim.status} />
                  </td>
                  <td className="px-6 py-3 text-[#9C9485]">
                    {new Date(claim.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/claims/${claim.id}`}
                        className="text-[#E8A020] font-medium hover:underline"
                      >
                        View →
                      </Link>
                      <DeleteButton table="claim_requests" id={claim.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
