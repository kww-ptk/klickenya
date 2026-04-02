"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { MenuData, MenuSection, MenuItem } from "@/components/listings/detail/restaurant/MenuDisplay";
import { ItemForm } from "./ItemForm";
import { useToast } from "@/components/ui/Toast";

/* ── Price formatter ───────────────────────────────── */

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

/* ── Props ─────────────────────────────────────────── */

interface MenuBuilderProps {
  menu: MenuData;
  scanCount: number;
  backHref?: string;
  backLabel?: string;
}

/* ── Component ─────────────────────────────────────── */

export function MenuBuilder({ menu: initialMenu, scanCount, backHref, backLabel }: MenuBuilderProps) {
  const [menu, setMenu] = useState<MenuData>(initialMenu);
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
  const { showToast } = useToast();

  const sections = [...menu.menu_sections].sort(
    (a, b) => a.display_order - b.display_order
  );

  /* ── Section CRUD ────────────────────────────────── */

  const addSection = useCallback(async () => {
    const title = addingSectionName.trim();
    if (!title) return;

    try {
      const res = await fetch("/api/menu/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menu.id, title }),
      });
      if (!res.ok) throw new Error();
      const section = await res.json();
      setMenu((prev) => ({
        ...prev,
        menu_sections: [
          ...prev.menu_sections,
          { ...section, menu_items: [] },
        ],
      }));
      setAddingSectionName("");
      setShowAddSection(false);
      showToast("Section added");
    } catch {
      showToast("Failed to add section", "error");
    }
  }, [addingSectionName, menu.id, showToast]);

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
      const res = await fetch("/api/menu/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, title: trimmed }),
      });
      if (!res.ok) throw new Error();
    } catch {
      showToast("Failed to rename section", "error");
    }
  }, [showToast]);

  const deleteSection = useCallback(async (sectionId: string, sectionTitle: string) => {
    if (!confirm(`Delete "${sectionTitle}"? This will also delete all items in this section.`)) return;

    // Optimistic
    setMenu((prev) => ({
      ...prev,
      menu_sections: prev.menu_sections.filter((s) => s.id !== sectionId),
    }));

    try {
      const res = await fetch("/api/menu/sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId }),
      });
      if (!res.ok) throw new Error();
      showToast("Section deleted");
    } catch {
      showToast("Failed to delete section", "error");
    }
  }, [showToast]);

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
      const res = await fetch("/api/menu/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (!res.ok) throw new Error();
      showToast("Item deleted");
    } catch {
      showToast("Failed to delete item", "error");
    }
  }, [showToast]);

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
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          {menu.name}
        </h1>
      </div>

      {/* Mobile: publish panel first */}
      <div className="lg:hidden mb-5">
        <PublishPanel />
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left: sections + items (60%) */}
        <div className="flex-1 min-w-0 lg:max-w-[60%]">
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
                    <span className="text-[#E2DDD5] cursor-grab select-none">≡</span>
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
                              <button
                                onClick={() =>
                                  setEditingForm({
                                    type: "edit",
                                    sectionId: section.id,
                                    item,
                                  })
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

                          {/* Inline edit form */}
                          {editingForm?.type === "edit" &&
                            editingForm.sectionId === section.id &&
                            editingForm.item?.id === item.id && (
                              <div className="px-4 pb-3">
                                <ItemForm
                                  sectionId={section.id}
                                  menuId={menu.id}
                                  item={item}
                                  onSave={(saved) => handleItemSave(section.id, saved)}
                                  onCancel={() => setEditingForm(null)}
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
