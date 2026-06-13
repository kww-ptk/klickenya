"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UnassignProps {
  hostId: string;
  sanityId: string;
  listingTitle: string;
  action: "unassign";
  isVerified?: boolean;
  hostName?: string;
}

interface SearchProps {
  hostId: string;
  hostName: string;
  action: "search";
  sanityId?: never;
  listingTitle?: never;
}

type Props = UnassignProps | SearchProps;

interface SearchResult {
  _id: string;
  title: string;
  type: string;
  city: string | null;
  isVerified: boolean;
}

export function HostListingActions(props: Props) {
  if (props.action === "unassign") return <UnassignButton {...props} />;
  return <AssignSearch {...props} />;
}

function UnassignButton({ hostId, sanityId, listingTitle, isVerified }: UnassignProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();

  async function handleUnassign() {
    if (!confirm(`Remove "${listingTitle}" from this host?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/hosts/${hostId}/unassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sanityId, listingTitle }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      alert("Failed to unassign");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch(`/api/admin/hosts/${hostId}/verify-listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sanityId }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      alert("Failed to verify");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      {!isVerified && (
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="text-[12px] font-medium text-green hover:underline disabled:opacity-50"
        >
          {verifying ? "..." : "Verify"}
        </button>
      )}
      <button
        onClick={handleUnassign}
        disabled={loading}
        className="text-[12px] font-medium text-red-500 hover:underline disabled:opacity-50"
      >
        {loading ? "..." : "Unassign"}
      </button>
    </>
  );
}

function AssignSearch({ hostId, hostName }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      // Use Sanity client directly from the browser
      const res = await fetch(`/api/admin/hosts/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  async function handleAssign(listing: SearchResult) {
    setAssigning(listing._id);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/hosts/${hostId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sanityId: listing._id,
          listingTitle: listing.title,
          listingType: listing.type,
          city: listing.city,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess(listing.title);
      setResults((prev) => prev.filter((r) => r._id !== listing._id));
      router.refresh();
    } catch {
      alert("Failed to assign");
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search listings by title (min 2 characters)..."
        className="w-full px-4 py-2.5 text-[14px] rounded-xl border border-border bg-canvas text-dark placeholder:text-text3 outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber"
      />

      {success && (
        <p className="mt-3 text-[13px] text-[#22C55E] font-medium">
          "{success}" assigned to {hostName}!
        </p>
      )}

      {searching && <p className="mt-3 text-[13px] text-text3">Searching...</p>}

      {results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((listing) => (
            <div key={listing._id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#F0EDE8]">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-dark truncate">{listing.title}</p>
                <p className="text-[11px] text-text3">
                  {listing.type} · {listing.city ?? "—"}
                  {listing.isVerified && <span className="ml-2 text-green">✓ Verified</span>}
                </p>
              </div>
              <button
                onClick={() => handleAssign(listing)}
                disabled={assigning === listing._id}
                className="shrink-0 px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-amber text-white hover:bg-[#d4911c] transition-colors disabled:opacity-50"
              >
                {assigning === listing._id ? "Assigning..." : `Assign to ${hostName}`}
              </button>
            </div>
          ))}
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <p className="mt-3 text-[13px] text-text3">No unassigned listings found for "{query}"</p>
      )}
    </div>
  );
}

export function SyncListingsButton({ hostId }: { hostId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/hosts/${hostId}/sync-listings`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(`Synced ${data.synced} listing${data.synced !== 1 ? "s" : ""}`);
      router.refresh();
    } catch {
      setResult("Failed to sync");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className="text-[12px] font-medium text-teal hover:underline disabled:opacity-50"
      >
        {loading ? "Syncing..." : "Sync to profile"}
      </button>
      {result && <span className="text-[11px] text-text3">{result}</span>}
    </div>
  );
}
