"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MenuData, MenuSection, MenuItem } from "@/components/listings/detail/restaurant/MenuDisplay";
import { ItemForm } from "./ItemForm";
import { OptionGroupEditor } from "./OptionGroupEditor";
import { TableSetup } from "./TableSetup";
import { MenuImporter } from "./MenuImporter";
import { useToast } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";

/* ── Price formatter ───────────────────────────────── */

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

/* ── Props ─────────────────────────────────────────── */

interface MenuBuilderProps {
  menu: MenuData;
  scanCount: number;
  tableOrdering: boolean;
  /** Reservation settings — used only to show the toggle status */
  reservationsEnabled?: boolean;
  defaultReservationDuration?: number;
  reservationsLeadTimeHours?: number;
  reservationsMaxPartySize?: number;
  reservationsMaxAdvanceDays?: number;
  listingSlug?: string | null;
  listingCity?: string | null;
  /** Sanity listing _id — links to /dashboard/listings/[id]/reservations */
  listingId?: string | null;
  /** Klickenya Kitchen feature flag — surfaces the stock CTA + per-item recipe link */
  stockEnabled?: boolean;
  /** Combined = one orders screen w/ tabs; Split = each station gets its own URL */
  orderViewMode?: "combined" | "split";
  backHref?: string;
  backLabel?: string;
  /**
   * "full"      — legacy /dashboard/menu/<id> behaviour: all 5 PublishPanel
   *               cards (table ordering toggle, reservations toggle, kitchen).
   * "menu-only" — strips out non-menu toggles and replaces them with hint
   *               cards that link to each feature's own page. Use this on
   *               the /eat tree where features have their own dedicated tabs.
   */
  mode?: "full" | "menu-only";
  /**
   * URL prefix for the "Other features" hint cards in menu-only mode.
   * Example: "/eat/listings/<sanityId>" → cards link to
   *   "/eat/listings/<sanityId>/reservations", "/.../orders", "/.../kitchen".
   * Required when mode === "menu-only".
   */
  featureBaseHref?: string;
}

/* ── Component ─────────────────────────────────────── */

export function MenuBuilder({
  menu: initialMenu,
  scanCount,
  tableOrdering: initialTableOrdering,
  reservationsEnabled: initialReservationsEnabled = false,
  listingSlug,
  listingCity,
  listingId,
  stockEnabled = false,
  orderViewMode: initialOrderViewMode = "combined",
  backHref,
  backLabel,
  mode = "full",
  featureBaseHref,
}: MenuBuilderProps) {
  const router = useRouter();
  const [menu, setMenu] = useState<MenuData>(initialMenu);
  const [tableOrdering, setTableOrdering] = useState(initialTableOrdering);
  const [reservationsEnabled, setReservationsEnabled] = useState(initialReservationsEnabled);
  const [orderViewMode, setOrderViewMode] = useState<"combined" | "split">(initialOrderViewMode);
  const [togglingOrdering, setTogglingOrdering] = useState(false);
  const [togglingReservations, setTogglingReservations] = useState(false);
  const [togglingViewMode, setTogglingViewMode] = useState(false);
  const [editingForm, setEditingForm] = useState<{
    type: "add" | "edit";
    sectionId: string;
    item?: MenuItem;
  } | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [addingSectionName, setAddingSectionName] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // saveStatus: tracks whether any background save is in flight
  const [activeSaves, setActiveSaves] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { showToast } = useToast();

  // Helper: wrap any async save operation with status tracking
  const withSave = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setActiveSaves((n) => n + 1);
    try {
      const result = await fn();
      setLastSaved(new Date());
      return result;
    } finally {
      setActiveSaves((n) => n - 1);
    }
  }, []);

  // Sync: full reload so server state replaces client useState
  const handleSync = useCallback(async () => {
    setSyncing(true);
    // router.refresh() alone won't reset useState — full reload is reliable
    window.location.reload();
  }, []);

  const sections = [...menu.menu_sections].sort(
    (a, b) => a.display_order - b.display_order
  );

  /* ── Section CRUD ────────────────────────────────── */

  const addSection = useCallback(async () => {
    const title = addingSectionName.trim();
    if (!title) return;

    try {
      const section = await withSave(async () => {
        const res = await fetch("/api/menu/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menu_id: menu.id, title }),
        });
        if (!res.ok) throw new Error();
        return res.json();
      });
      setMenu((prev) => ({
        ...prev,
        menu_sections: [...prev.menu_sections, { ...section, menu_items: [] }],
      }));
      setAddingSectionName("");
      setShowAddSection(false);
      showToast("Section added");
    } catch {
      showToast("Failed to add section", "error");
    }
  }, [addingSectionName, menu.id, withSave, showToast]);

  const renameSection = useCallback(async (sectionId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) {
      setEditingSectionId(null);
      return;
    }

    // Optimistic update
    setMenu((prev) => ({
      ...prev,
      menu_sections: prev.menu_sections.map((s) =>
        s.id === sectionId ? { ...s, title: trimmed } : s
      ),
    }));
    setEditingSectionId(null);

    try {
      await withSave(async () => {
        const res = await fetch("/api/menu/sections", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section_id: sectionId, title: trimmed }),
        });
        if (!res.ok) throw new Error();
      });
    } catch {
      showToast("Failed to rename section", "error");
    }
  }, [withSave, showToast]);

  const setSectionStation = useCallback(async (sectionId: string, station: "kitchen" | "bar") => {
    const prev = menu;
    // Optimistic update
    setMenu((m) => ({
      ...m,
      menu_sections: m.menu_sections.map((row) =>
        row.id === sectionId ? { ...row, station } : row
      ),
    }));
    try {
      const res = await fetch("/api/menu/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, station }),
      });
      if (!res.ok) {
        setMenu(prev); // rollback
        showToast("Couldn't update station", "error");
        return;
      }
      showToast(`Routed to ${station === "bar" ? "Bar" : "Kitchen"}`, "success");
    } catch {
      setMenu(prev);
      showToast("Network error", "error");
    }
  }, [menu, showToast]);

  const moveSection = useCallback(async (sectionId: string, direction: "up" | "down") => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sections.length - 1) return;

    const newOrder = [...sections];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    const orderedIds = newOrder.map((s) => s.id);

    // Optimistic update
    setMenu((prev) => ({
      ...prev,
      menu_sections: prev.menu_sections.map((s) => {
        const newPos = orderedIds.indexOf(s.id);
        return newPos === -1 ? s : { ...s, display_order: newPos };
      }),
    }));

    try {
      await withSave(async () => {
        const res = await fetch("/api/menu/sections", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reorder", menu_id: menu.id, ordered_ids: orderedIds }),
        });
        if (!res.ok) throw new Error();
      });
    } catch {
      showToast("Failed to reorder sections", "error");
    }
  }, [sections, menu.id, withSave, showToast]);

  const deleteSection = useCallback(async (sectionId: string, sectionTitle: string) => {
    if (!confirm(`Delete "${sectionTitle}"? This will also delete all items in this section.`)) return;

    // Optimistic
    setMenu((prev) => ({
      ...prev,
      menu_sections: prev.menu_sections.filter((s) => s.id !== sectionId),
    }));

    try {
      await withSave(async () => {
        const res = await fetch("/api/menu/sections", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section_id: sectionId }),
        });
        if (!res.ok) throw new Error();
      });
      showToast("Section deleted");
    } catch {
      showToast("Failed to delete section", "error");
    }
  }, [withSave, showToast]);

  /* ── Item CRUD ───────────────────────────────────── */

  const handleItemSave = useCallback((sectionId: string, savedItem: MenuItem) => {
    // Handle rollback signal
    if (savedItem.id === "__ROLLBACK__") {
      setMenu((prev) => ({
        ...prev,
        menu_sections: prev.menu_sections.map((s) =>
          s.id === sectionId
            ? { ...s, menu_items: s.menu_items.filter((i) => !i.id.startsWith("temp-")) }
            : s
        ),
      }));
      showToast("Failed to save item", "error");
      return;
    }

    setMenu((prev) => ({
      ...prev,
      menu_sections: prev.menu_sections.map((s) => {
        if (s.id !== sectionId) return s;
        const existing = s.menu_items.find((i) => i.id === savedItem.id);
        const tempItem = s.menu_items.find((i) => i.id.startsWith("temp-"));

        if (existing) {
          // Update existing item
          return {
            ...s,
            menu_items: s.menu_items.map((i) => (i.id === savedItem.id ? savedItem : i)),
          };
        } else if (tempItem) {
          // Replace temp item with real server item
          return {
            ...s,
            menu_items: s.menu_items.map((i) => (i.id === tempItem.id ? savedItem : i)),
          };
        } else {
          // New item (optimistic add)
          return { ...s, menu_items: [...s.menu_items, savedItem] };
        }
      }),
    }));
    setEditingForm(null);
  }, [showToast]);

  const deleteItem = useCallback(async (sectionId: string, itemId: string) => {
    // Optimistic
    setMenu((prev) => ({
      ...prev,
      menu_sections: prev.menu_sections.map((s) =>
        s.id === sectionId
          ? { ...s, menu_items: s.menu_items.filter((i) => i.id !== itemId) }
          : s
      ),
    }));

    try {
      await withSave(async () => {
        const res = await fetch("/api/menu/items", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_id: itemId }),
        });
        if (!res.ok) throw new Error();
      });
      showToast("Item deleted");
    } catch {
      showToast("Failed to delete item", "error");
    }
  }, [withSave, showToast]);

  /* ── Featured toggle ────────────────────────────── */

  const toggleFeatured = useCallback(async (item: MenuItem) => {
    const newFeatured = !item.is_featured;

    if (newFeatured) {
      const featuredCount = menu.menu_sections
        .flatMap((s) => s.menu_items)
        .filter((i) => i.is_featured).length;
      if (featuredCount >= 5) {
        showToast("You can feature up to 5 items. Unstar one to add another.", "error");
        return;
      }
    }

    // Optimistic update
    setMenu((prev) => ({
      ...prev,
      menu_sections: prev.menu_sections.map((s) => ({
        ...s,
        menu_items: s.menu_items.map((i) =>
          i.id === item.id ? { ...i, is_featured: newFeatured } : i
        ),
      })),
    }));

    try {
      const res = await fetch("/api/menu/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, is_featured: newFeatured }),
      });
      if (!res.ok) {
        // Revert
        setMenu((prev) => ({
          ...prev,
          menu_sections: prev.menu_sections.map((s) => ({
            ...s,
            menu_items: s.menu_items.map((i) =>
              i.id === item.id ? { ...i, is_featured: item.is_featured } : i
            ),
          })),
        }));
        const data = await res.json().catch(() => ({}));
        showToast((data as { error?: string }).error ?? "Failed to update", "error");
      }
    } catch {
      showToast("Failed to update", "error");
    }
  }, [menu.menu_sections, showToast]);

  /* ── Table ordering toggle ───────────────────────── */

  const toggleTableOrdering = useCallback(async () => {
    const enabling = !tableOrdering;

    // If disabling, warn user if there are open orders
    if (!enabling) {
      if (!confirm("Disable table ordering? Guests will no longer be able to place orders from their table.")) {
        return;
      }
    }

    setTogglingOrdering(true);
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menu.id, table_ordering: enabling }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      // Warn about open orders after disabling
      if (!enabling && data.open_order_count > 0) {
        showToast(
          `Table ordering disabled. ${data.open_order_count} order${data.open_order_count > 1 ? "s" : ""} still in progress.`,
          "error"
        );
      } else {
        showToast(enabling ? "Table ordering enabled" : "Table ordering disabled");
      }

      setTableOrdering(enabling);
    } catch {
      showToast("Failed to update table ordering setting", "error");
    } finally {
      setTogglingOrdering(false);
    }
  }, [menu.id, tableOrdering, showToast]);

  /* ── Reservations toggle ─────────────────────────── */

  const toggleReservations = useCallback(async () => {
    const enabling = !reservationsEnabled;
    setTogglingReservations(true);
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: menu.id,
          reservations_enabled: enabling,
          // Pass listing_city so the settings PATCH can revalidatePath for the listing page.
          // TODO: Store listing_city on the menus table so future PATCH calls don't
          //       need to be told where their own listing lives.
          listing_city: listingCity ?? undefined,
        }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setReservationsEnabled(enabling);

      if (enabling && data.seeded_areas) {
        showToast("Reservations enabled — Indoor & Terrace areas created");
      } else {
        showToast(enabling ? "Reservations enabled" : "Reservations disabled");
      }
    } catch {
      showToast("Failed to update reservations setting", "error");
    } finally {
      setTogglingReservations(false);
    }
  }, [menu.id, reservationsEnabled, listingCity, showToast]);

  /* ── Split-station view toggle ───────────────────── */

  const toggleSplitMode = useCallback(async () => {
    const next: "combined" | "split" = orderViewMode === "split" ? "combined" : "split";
    const prev = orderViewMode;
    setOrderViewMode(next); // optimistic
    setTogglingViewMode(true);
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menu.id, order_view_mode: next }),
      });
      if (!res.ok) {
        setOrderViewMode(prev);
        showToast("Couldn't save", "error");
        return;
      }
      showToast(
        next === "split"
          ? "Each station now has its own URL"
          : "Kitchen and bar share one screen with tabs",
        "success",
      );
    } catch {
      setOrderViewMode(prev);
      showToast("Network error", "error");
    } finally {
      setTogglingViewMode(false);
    }
  }, [menu.id, orderViewMode, showToast]);

  /* ── Publish ─────────────────────────────────────── */

  const togglePublish = useCallback(async () => {
    setPublishing(true);
    const newState = !menu.is_published;

    try {
      const res = await fetch("/api/menu/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menu.id, is_published: newState }),
      });
      if (!res.ok) throw new Error();
      setMenu((prev) => ({ ...prev, is_published: newState }));
      showToast(newState ? "Menu published!" : "Menu taken offline");
    } catch {
      showToast("Failed to update menu status", "error");
    } finally {
      setPublishing(false);
    }
  }, [menu.id, menu.is_published, showToast]);

  /* ── Publish panel ───────────────────────────────── */

  function PublishPanel() {
    // Show the split-station toggle only when the menu has at least one
    // bar-routed section — otherwise the choice is meaningless.
    const hasBarSections = menu.menu_sections.some((s) => s.station === "bar");

    return (
      <div className="space-y-4">
        {/* Status card */}
        <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            {menu.is_published ? (
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wide">Live</span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-bold text-[#9C9485] bg-[#F4F1EC] px-2.5 py-0.5 rounded-full uppercase tracking-wide">Draft</span>
            )}
          </div>

          {menu.is_published ? (
            <>
              <p className="text-[13px] text-[#5E5848] mb-2">Your menu is live at:</p>
              <Link
                href={`/m/${menu.slug}`}
                target="_blank"
                className="text-[13px] font-semibold text-[#E8A020] hover:underline break-all"
              >
                klickenya.com/m/{menu.slug}
              </Link>
              <div className="flex flex-col gap-2 mt-4">
                <Link
                  href={`/dashboard/menu/${menu.id}/qr`}
                  className="w-full h-[36px] rounded-full bg-[#16130C] text-white text-[13px] font-bold flex items-center justify-center hover:bg-[#2A2520] transition-colors"
                >
                  Download QR code →
                </Link>
                <button
                  onClick={togglePublish}
                  disabled={publishing}
                  className="w-full h-[36px] rounded-full border border-[#E2DDD5] text-[13px] font-semibold text-[#5E5848] hover:border-[#9C9485] transition-colors disabled:opacity-50"
                >
                  Take offline
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] text-[#5E5848] mb-3">
                Your menu is not visible to customers yet.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={togglePublish}
                  disabled={publishing || sections.length === 0}
                  className="w-full h-[40px] rounded-full bg-[#E8A020] text-[#16130C] text-[13px] font-bold hover:bg-[#d4911c] transition-colors disabled:opacity-50"
                >
                  {publishing ? "Publishing..." : "Publish menu"}
                </button>
                <Link
                  href={`/m/${menu.slug}`}
                  target="_blank"
                  className="text-center text-[13px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors"
                >
                  Preview ↗
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Scan stats */}
        <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm">
          <p className="text-[14px] font-semibold text-[#16130C] mb-1">
            🔍 {scanCount} scan{scanCount !== 1 ? "s" : ""} this week
          </p>
          {scanCount === 0 ? (
            <p className="text-[12px] text-[#9C9485]">
              No scans yet — publish your menu and share the QR code
            </p>
          ) : (
            <p className="text-[12px] text-[#9C9485]">
              People are viewing your menu
            </p>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────────
            menu-only mode (used by /eat): the cards below are replaced with
            a single "Other features" hint card. Menu builder stays focused
            on its own job — publish, scans, QR — and links out for everything
            else. Full mode keeps the legacy toggles so /dashboard/menu/<id>
            users don't lose their on/off switches.
        ─────────────────────────────────────────────────────────────────── */}
        {mode === "menu-only" ? (
          <OtherFeaturesHintCard
            featureBaseHref={featureBaseHref ?? ""}
            reservationsEnabled={reservationsEnabled}
            tableOrdering={tableOrdering}
            stockEnabled={stockEnabled}
          />
        ) : (
          <>
            {/* Table ordering toggle */}
            <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[14px] font-semibold text-[#16130C]">Table ordering</p>
                <Toggle
                  checked={tableOrdering}
                  onChange={toggleTableOrdering}
                  disabled={togglingOrdering}
                />
              </div>
              <p className="text-[12px] text-[#9C9485]">
                {tableOrdering
                  ? "Guests can order from their table using the menu QR code."
                  : "Enable to let guests place orders from their table."}
              </p>

              {tableOrdering && (
                <>
                  <div className="mt-3 p-3 rounded-lg bg-[#E8A020]/8 border border-[#E8A020]/20">
                    <p className="text-[12px] text-[#5E5848]">
                      <span className="font-bold">Heads up:</span> Make sure someone is watching the kitchen dashboard when ordering is active.
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/menu/${menu.id}/orders`}
                    className="mt-3 flex items-center justify-center gap-2 w-full h-[36px] rounded-full bg-[#16130C] text-white text-[13px] font-bold hover:bg-[#2A2520] transition-colors"
                  >
                    <span>🍳</span>
                    Kitchen view →
                  </Link>
                  {hasBarSections && (
                    <div className="mt-3 flex items-start gap-3 p-3 rounded-lg bg-[#F4F1EC] border border-[#E2DDD5]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#16130C] mb-0.5">
                          Separate kitchen and bar screens
                        </p>
                        <p className="text-[11px] text-[#9C9485] leading-snug">
                          {orderViewMode === "split"
                            ? "Each station has its own URL — perfect for a dedicated bar tablet."
                            : "One dashboard with tabs to switch between stations."}
                        </p>
                      </div>
                      <Toggle
                        checked={orderViewMode === "split"}
                        onChange={toggleSplitMode}
                        disabled={togglingViewMode}
                      />
                    </div>
                  )}
                  <Link
                    href={`/dashboard/menu/${menu.id}/audit`}
                    className="mt-2 flex items-center justify-center gap-2 w-full h-[36px] rounded-full bg-white border border-[#E2DDD5] text-[#16130C] text-[13px] font-bold hover:border-[#16130C] transition-colors"
                  >
                    <span>📋</span>
                    Audit log →
                  </Link>
                </>
              )}
            </div>

            {/* Table reservations — compact card; full settings live in listing dashboard */}
            <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[14px] font-semibold text-[#16130C]">Table reservations</p>
                <Toggle
                  checked={reservationsEnabled}
                  onChange={toggleReservations}
                  disabled={togglingReservations}
                />
              </div>
              <p className="text-[12px] text-[#9C9485]">
                {reservationsEnabled
                  ? "Active — guests can request tables via your listing and menu page."
                  : "Enable to accept table reservation requests from guests."}
              </p>
              {reservationsEnabled && listingId && (
                <Link
                  href={`/dashboard/listings/${listingId}/reservations`}
                  className="mt-3 flex items-center justify-center gap-2 w-full h-[36px] rounded-full bg-[#16130C] text-white text-[13px] font-bold hover:bg-[#2A2520] transition-colors"
                >
                  Manage reservations →
                </Link>
              )}
              {reservationsEnabled && !listingId && (
                <div className="mt-3 p-3 rounded-lg bg-[#E8A020]/8 border border-[#E8A020]/20">
                  <p className="text-[12px] text-[#5E5848]">
                    <span className="font-bold">Active.</span> Configure booking rules and seating areas in your listing&apos;s Reservations → Settings tab.
                  </p>
                </div>
              )}
            </div>
            {/* Note: the embed-on-your-website panel moved to the listing's
                Reservations → Settings tab (its proper home — it's a reservations
                setting, not a menu-editor concern). */}

            {/* Klickenya Kitchen — stock & recipe costing */}
            <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[14px] font-semibold text-[#16130C]">🍳 Klickenya Kitchen</p>
                {stockEnabled && (
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    On
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#9C9485]">
                {stockEnabled
                  ? "Recipes, stock and costing for every dish."
                  : "Track recipe costs and stock levels alongside your menu."}
              </p>
              <Link
                href={`/dashboard/menu/${menu.id}/stock`}
                className="mt-3 flex items-center justify-center gap-2 w-full h-[36px] rounded-full bg-[#16130C] text-white text-[13px] font-bold hover:bg-[#2A2520] transition-colors"
              >
                {stockEnabled ? "Open kitchen →" : "Set up →"}
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Main render ─────────────────────────────────── */

  return (
    <div>
      {/* Back link + title */}
      <div className="mb-5">
        <Link
          href={backHref ?? "/dashboard"}
          className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          {backLabel ?? "← Back to dashboard"}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] flex-1">
            {menu.name}
          </h1>

          {/* Auto-save status */}
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[12px] shrink-0">
            {activeSaves > 0 ? (
              <>
                <span className="inline-block size-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[#9C9485]">Saving…</span>
              </>
            ) : lastSaved ? (
              <>
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                <span className="text-[#9C9485]">Saved</span>
              </>
            ) : null}
          </span>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Reload menu from server"
            className="shrink-0 h-[36px] px-3 rounded-full border border-[#E2DDD5] text-[13px] font-semibold text-[#5E5848] hover:border-[#9C9485] transition-colors disabled:opacity-50"
          >
            {syncing ? "⟳" : "↺ Sync"}
          </button>

          <button
            onClick={() => setShowImporter(true)}
            className="shrink-0 h-[36px] px-4 rounded-full border border-[#E2DDD5] text-[13px] font-semibold text-[#5E5848] hover:border-[#E8A020]/60 hover:text-[#E8A020] transition-colors"
          >
            Import menu
          </button>
        </div>
      </div>

      {/* Import overlay */}
      {showImporter && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
          <MenuImporter
            menuId={menu.id}
            onClose={() => setShowImporter(false)}
            onComplete={() => {
              // Full reload so useState re-initialises with fresh server data.
              // router.refresh() alone re-fetches server components but cannot
              // reset client-side useState, so imported sections would not appear.
              window.location.reload();
            }}
          />
        </div>
      )}

      {/* Mobile: publish panel first */}
      <div className="lg:hidden mb-5">
        <PublishPanel />
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left: sections + items (60%) */}
        <div className="flex-1 min-w-0 lg:max-w-[60%]">

          {/* Table setup — only shown when table ordering is enabled */}
          {tableOrdering && (
            <TableSetup menuId={menu.id} showToast={showToast} />
          )}

          {sections.length === 0 && !showAddSection ? (
            <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-[28px]">🍽️</span>
              </div>
              <p className="font-display text-[16px] font-bold text-[#16130C] mb-1">
                No sections yet
              </p>
              <p className="text-[13px] text-[#9C9485] mb-4 max-w-[280px] mx-auto">
                Add your first section to get started
              </p>
              <button
                onClick={() => setShowAddSection(true)}
                className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
              >
                Add section
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] shadow-sm overflow-hidden"
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F4F1EC]">
                    {/* Up / down reorder buttons */}
                    <div className="flex flex-col shrink-0">
                      <button
                        onClick={() => moveSection(section.id, "up")}
                        disabled={sections.indexOf(section) === 0}
                        className="text-[#C5BFB5] hover:text-[#E8A020] disabled:opacity-20 disabled:cursor-default leading-none transition-colors"
                        title="Move section up"
                        aria-label="Move section up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveSection(section.id, "down")}
                        disabled={sections.indexOf(section) === sections.length - 1}
                        className="text-[#C5BFB5] hover:text-[#E8A020] disabled:opacity-20 disabled:cursor-default leading-none transition-colors"
                        title="Move section down"
                        aria-label="Move section down"
                      >
                        ▼
                      </button>
                    </div>
                    {editingSectionId === section.id ? (
                      <input
                        type="text"
                        value={editingSectionTitle}
                        onChange={(e) => setEditingSectionTitle(e.target.value)}
                        onBlur={() => renameSection(section.id, editingSectionTitle)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameSection(section.id, editingSectionTitle);
                          if (e.key === "Escape") setEditingSectionId(null);
                        }}
                        className="flex-1 text-[15px] font-bold text-[#16130C] bg-transparent border-b-2 border-[#E8A020] outline-none py-0.5"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditingSectionId(section.id);
                          setEditingSectionTitle(section.title);
                        }}
                        className="flex-1 text-left text-[15px] font-bold text-[#16130C] hover:text-[#E8A020] transition-colors"
                      >
                        {section.title}
                      </button>
                    )}
                    <div className="inline-flex shrink-0 rounded-full border border-[#E2DDD5] overflow-hidden text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setSectionStation(section.id, "kitchen")}
                        title="Route this section to the kitchen dashboard"
                        className={`px-2.5 h-[26px] transition-colors ${
                          section.station === "kitchen"
                            ? "bg-[#E8A020] text-[#16130C]"
                            : "bg-white text-[#9C9485] hover:bg-[#FAF6EE]"
                        }`}
                      >
                        🍳
                      </button>
                      <button
                        type="button"
                        onClick={() => setSectionStation(section.id, "bar")}
                        title="Route this section to the bar dashboard"
                        className={`px-2.5 h-[26px] transition-colors ${
                          section.station === "bar"
                            ? "bg-teal-500 text-white"
                            : "bg-white text-[#9C9485] hover:bg-[#EEF7F6]"
                        }`}
                      >
                        🍹
                      </button>
                    </div>
                    <button
                      onClick={() => deleteSection(section.id, section.title)}
                      className="text-[#E2DDD5] hover:text-[#DC2626] transition-colors text-[16px] px-1"
                      title="Delete section"
                    >
                      🗑
                    </button>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-[#F4F1EC]">
                    {[...section.menu_items]
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((item) => (
                        <div key={item.id}>
                          <div className="flex items-center gap-3 px-4 py-3">
                            {/* Star / featured toggle */}
                            <button
                              onClick={() => toggleFeatured(item)}
                              title={item.is_featured ? "Remove from featured" : "Feature this item"}
                              className="shrink-0 text-[15px] leading-none transition-colors"
                              style={{ color: item.is_featured ? "#E8A020" : "#D4CFC8" }}
                            >
                              {item.is_featured ? "★" : "☆"}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-semibold text-[#16130C]">
                                {item.name}
                              </span>
                              {item.dietary_tags.length > 0 && (
                                <span className="text-[11px] text-[#9C9485] ml-1.5">
                                  {item.dietary_tags.join(", ")}
                                </span>
                              )}
                            </div>
                            <span className="text-[13px] font-bold text-[#E8A020] shrink-0">
                              {item.is_available ? formatPrice(item.price_kes) : "—"}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {stockEnabled && (
                                <Link
                                  href={`/dashboard/menu/${menu.id}/items/${item.id}`}
                                  className="text-[#E2DDD5] hover:text-[#E8A020] transition-colors text-[14px] px-0.5"
                                  title="Edit recipe"
                                  aria-label="Edit recipe"
                                >
                                  📖
                                </Link>
                              )}
                              <button
                                onClick={() =>
                                  setEditingForm(
                                    editingForm?.item?.id === item.id
                                      ? null
                                      : { type: "edit", sectionId: section.id, item }
                                  )
                                }
                                className="text-[#E2DDD5] hover:text-[#E8A020] transition-colors text-[14px] px-0.5"
                                title="Edit item"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteItem(section.id, item.id)}
                                className="text-[#E2DDD5] hover:text-[#DC2626] transition-colors text-[14px] px-0.5"
                                title="Delete item"
                              >
                                🗑
                              </button>
                            </div>
                          </div>

                          {/* Inline edit form + options — combined panel */}
                          {editingForm?.type === "edit" &&
                            editingForm.sectionId === section.id &&
                            editingForm.item?.id === item.id && (
                              <div className="px-4 pb-4 border-t border-[#F4F1EC] bg-[#FAFAF8]">
                                <div className="pt-3">
                                  <ItemForm
                                    sectionId={section.id}
                                    menuId={menu.id}
                                    item={item}
                                    onSave={(saved) => handleItemSave(section.id, saved)}
                                    onCancel={() => setEditingForm(null)}
                                  />
                                </div>
                                <OptionGroupEditor
                                  menuItemId={item.id}
                                  menuItemName={item.name}
                                  onClose={() => setEditingForm(null)}
                                  showToast={showToast}
                                  embedded
                                />
                              </div>
                            )}
                        </div>
                      ))}
                  </div>

                  {/* Inline add form */}
                  {editingForm?.type === "add" &&
                    editingForm.sectionId === section.id && (
                      <div className="px-4 py-3 border-t border-[#F4F1EC]">
                        <ItemForm
                          sectionId={section.id}
                          menuId={menu.id}
                          onSave={(saved) => handleItemSave(section.id, saved)}
                          onCancel={() => setEditingForm(null)}
                        />
                      </div>
                    )}

                  {/* Add item link */}
                  {!(editingForm?.type === "add" && editingForm.sectionId === section.id) && (
                    <button
                      onClick={() => {
                        setEditingForm({ type: "add", sectionId: section.id });
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-[#E8A020] hover:bg-[#E8A020]/5 transition-colors"
                    >
                      + Add item
                    </button>
                  )}
                </div>
              ))}

              {/* Add section */}
              {showAddSection ? (
                <div className="bg-white rounded-xl border border-[#E2DDD5] p-4 shadow-sm">
                  <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Section name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addingSectionName}
                      onChange={(e) => setAddingSectionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addSection();
                        if (e.key === "Escape") {
                          setShowAddSection(false);
                          setAddingSectionName("");
                        }
                      }}
                      placeholder='e.g. "Mains", "Drinks", "Desserts"'
                      className="flex-1 border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 bg-white"
                      autoFocus
                    />
                    <button
                      onClick={addSection}
                      disabled={!addingSectionName.trim()}
                      className="bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-4 h-[40px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50 shrink-0"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddSection(false);
                        setAddingSectionName("");
                      }}
                      className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors px-2 shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddSection(true)}
                  className="w-full border border-dashed border-[#E2DDD5] rounded-xl py-3 text-[13px] font-semibold text-[#9C9485] hover:text-[#E8A020] hover:border-[#E8A020]/40 transition-colors"
                >
                  + Add section
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: publish panel (desktop only — already shown on mobile above) */}
        <div className="hidden lg:block w-[40%] shrink-0">
          <div className="sticky top-8">
            <PublishPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── OtherFeaturesHintCard ──────────────────────────────────────────────
 * Used in menu-only mode (the /eat tree) to replace the in-place toggles
 * with three "hint" rows that link to each feature's own page. Tooltips
 * (native title) explain the feature in plain language without dragging
 * the owner out of menu-creation flow.
 *
 * Order = the feature dependency chain the user described:
 *   1. Reservations (next step after publishing a menu)
 *   2. Table Ordering (POS, kitchen, waiter — depends on a menu)
 *   3. Kitchen Costing (advanced — depends on a menu)
 * ─────────────────────────────────────────────────────────────────────── */
function OtherFeaturesHintCard({
  featureBaseHref,
  reservationsEnabled,
  tableOrdering,
  stockEnabled,
}: {
  featureBaseHref: string;
  reservationsEnabled: boolean;
  tableOrdering: boolean;
  stockEnabled: boolean;
}) {
  const hints = [
    {
      key: "reservations",
      icon: "📅",
      title: "Table reservations",
      blurb: "Let guests book a table online; you approve or decline from your dashboard.",
      tooltip:
        "Accept and manage reservation requests. Guests pick a date, time, party size, and area; you approve or decline. Email + WhatsApp confirmations included.",
      enabled: reservationsEnabled,
      href: `${featureBaseHref}/reservations`,
    },
    {
      key: "orders",
      icon: "🛒",
      title: "Table ordering",
      blurb: "Guests order from their table via QR code; kitchen and bar see live tickets.",
      tooltip:
        "Tablet POS for staff, QR ordering for guests, real-time kitchen + bar tickets. Includes split bills, table sessions, and audit log.",
      enabled: tableOrdering,
      href: `${featureBaseHref}/orders`,
    },
    {
      key: "kitchen",
      icon: "🍳",
      title: "Kitchen costing",
      blurb: "Recipes, stock, and per-dish margin. Auto-deducts when orders fire.",
      tooltip:
        "Klickenya Kitchen — build recipes for every menu item, log purchases and waste, see real margin per dish. Stock deducts automatically when an order fires from table ordering or POS.",
      enabled: stockEnabled,
      href: `${featureBaseHref}/kitchen`,
    },
  ];

  return (
    <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm">
      <p className="text-[14px] font-semibold text-[#16130C] mb-1">
        Other features
      </p>
      <p className="text-[12px] text-[#9C9485] mb-3">
        Each lives on its own page — open one to set it up or manage it.
      </p>

      <div className="space-y-1.5">
        {hints.map((h) => (
          <Link
            key={h.key}
            href={h.href}
            title={h.tooltip}
            className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#FAFAF8] transition-colors"
          >
            <span className="shrink-0 text-[18px] leading-none mt-0.5">{h.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-[#16130C] group-hover:text-[#E8A020] transition-colors">
                  {h.title}
                </p>
                {h.enabled && (
                  <span className="inline-flex items-center text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    On
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#9C9485] leading-snug mt-0.5">
                {h.blurb}
              </p>
            </div>
            <span className="shrink-0 text-[#C5BFB5] text-[14px] mt-1 group-hover:text-[#E8A020] transition-colors">
              ›
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
