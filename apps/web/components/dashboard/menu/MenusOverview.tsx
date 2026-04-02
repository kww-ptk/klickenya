"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface MenuRow {
  id: string;
  slug: string;
  display_name: string | null;
  listing_slug: string | null;
  is_published: boolean;
  created_at: string;
}

interface MenusOverviewProps {
  menus: MenuRow[];
}

export function MenusOverview({ menus }: MenusOverviewProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // Group by listing_slug
  const grouped = new Map<string, MenuRow[]>();
  for (const m of menus) {
    const key = m.listing_slug ?? m.slug;
    const list = grouped.get(key) ?? [];
    list.push(m);
    grouped.set(key, list);
  }

  if (menus.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-[28px]">🍽️</span>
        </div>
        <p className="font-display text-[16px] font-bold text-[#16130C] mb-1">
          No menus yet
        </p>
        <p className="text-[13px] text-[#9C9485] mb-4 max-w-[280px] mx-auto">
          Claim a restaurant listing first, then come back here to build your menu
        </p>
        <Link
          href="/"
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
        >
          Browse restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {Array.from(grouped.entries()).map(([listingSlug, groupMenus]) => (
        <ListingMenuGroup
          key={listingSlug}
          listingSlug={listingSlug}
          menus={groupMenus}
          onCreated={() => router.refresh()}
          showToast={showToast}
        />
      ))}
    </div>
  );
}

/* ── Group per listing ─────────────────────────────── */

function ListingMenuGroup({
  listingSlug,
  menus,
  onCreated,
  showToast,
}: {
  listingSlug: string;
  menus: MenuRow[];
  onCreated: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);

  function suggestSlug(name: string) {
    const base = listingSlug + "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    setNewSlug(base);
  }

  async function handleCreate() {
    if (!newName.trim() || !newSlug.trim() || creating) return;
    setCreating(true);

    try {
      const res = await fetch("/api/menu/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_slug: listingSlug,
          display_name: newName.trim(),
          slug: newSlug.trim(),
        }),
      });

      if (res.status === 409) {
        const { suggestion } = await res.json();
        setNewSlug(suggestion);
        showToast("That slug is taken — try the suggested one", "error");
        return;
      }

      if (!res.ok) throw new Error();

      showToast("Menu created");
      setShowAdd(false);
      setNewName("");
      setNewSlug("");
      onCreated();
    } catch {
      showToast("Failed to create menu", "error");
    } finally {
      setCreating(false);
    }
  }

  const inputCls = "w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 transition-colors bg-white";

  return (
    <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] shadow-sm overflow-hidden">
      {/* Group header */}
      <div className="px-4 py-3 bg-[#F4F1EC] border-b border-[#E2DDD5]">
        <p className="text-[14px] font-bold text-[#16130C]">
          {menus[0]?.display_name?.replace(/ Menu$/, "") ?? listingSlug}
        </p>
        <p className="text-[11px] text-[#9C9485] mt-0.5 font-mono">
          {listingSlug}
        </p>
      </div>

      {/* Menu rows */}
      <div className="divide-y divide-[#F4F1EC]">
        {menus.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-[#16130C]">
                {m.display_name ?? m.slug}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {m.is_published ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/8 px-2 py-0.5 rounded-full">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Live
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#9C9485] bg-[#F4F1EC] px-2 py-0.5 rounded-full">
                  Draft
                </span>
              )}
              <Link
                href={`/dashboard/menu/${m.id}`}
                className="text-[12px] font-semibold text-[#E8A020] hover:text-[#d4911c] transition-colors"
              >
                Edit
              </Link>
              <Link
                href={`/m/${m.slug}`}
                target="_blank"
                className="text-[12px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors"
              >
                View ↗
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Add another menu */}
      {showAdd ? (
        <div className="px-4 py-3 border-t border-[#E2DDD5] space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Menu name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                suggestSlug(e.target.value);
              }}
              placeholder='e.g. "Drinks Menu", "Lunch Menu"'
              className={inputCls}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Public URL</label>
            <div className="flex items-center gap-0">
              <span className="text-[12px] text-[#9C9485] shrink-0">klickenya.com/m/</span>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || !newSlug.trim() || creating}
              className="bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[36px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create menu"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(""); setNewSlug(""); }}
              className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-[#E8A020] hover:bg-[#E8A020]/5 transition-colors border-t border-[#F4F1EC]"
        >
          + Add another menu for this restaurant
        </button>
      )}
    </div>
  );
}
