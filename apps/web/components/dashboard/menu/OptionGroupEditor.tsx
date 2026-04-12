"use client";

import { useState, useEffect, useCallback } from "react";
import type { ItemOptionGroup, ItemOption } from "@/components/listings/detail/restaurant/MenuDisplay";

/* ── Props ─────────────────────────────────────────── */

interface OptionGroupEditorProps {
  menuItemId: string;
  menuItemName: string;
  onClose: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  /** When true, renders without the header title/close button — for use inside ItemForm */
  embedded?: boolean;
}

/* ── Helper ────────────────────────────────────────── */

function formatPrice(n: number): string {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  single:  "Single choice (radio)",
  multi:   "Multiple choice (checkboxes)",
  allergy: "Allergy flags (no charge)",
};

/* ── Option row ────────────────────────────────────── */

interface OptionRowProps {
  option: ItemOption;
  groupType: string;
  onDelete: (optionId: string) => void;
  onToggleAvailable: (optionId: string, current: boolean) => void;
}

function OptionRow({ option, groupType, onDelete, onToggleAvailable }: OptionRowProps) {
  return (
    <div className="flex items-center gap-2 py-1.5 pl-3">
      <span className="flex-1 text-[13px] text-[#16130C] truncate">
        {option.name}
        {groupType !== "allergy" && option.price_modifier > 0 && (
          <span className="text-[#9C9485] ml-1.5">+{formatPrice(option.price_modifier)}</span>
        )}
      </span>
      {!option.is_available && (
        <span className="text-[10px] bg-[#F4F1EC] text-[#9C9485] font-semibold px-1.5 py-0.5 rounded-full">Off</span>
      )}
      <button
        onClick={() => onToggleAvailable(option.id, option.is_available)}
        className="text-[11px] text-[#9C9485] hover:text-[#16130C] transition-colors shrink-0"
        title={option.is_available ? "Mark unavailable" : "Mark available"}
      >
        {option.is_available ? "Hide" : "Show"}
      </button>
      <button
        onClick={() => onDelete(option.id)}
        className="text-[#E2DDD5] hover:text-[#DC2626] transition-colors text-[13px] shrink-0"
        title="Delete option"
      >
        ✕
      </button>
    </div>
  );
}

/* ── Group card ────────────────────────────────────── */

interface GroupCardProps {
  group: ItemOptionGroup;
  onDeleteGroup: (groupId: string, name: string) => void;
  onDeleteOption: (groupId: string, optionId: string) => void;
  onToggleOption: (groupId: string, optionId: string, current: boolean) => void;
  onAddOption: (groupId: string, name: string, priceModifier: number) => Promise<void>;
}

function GroupCard({ group, onDeleteGroup, onDeleteOption, onToggleOption, onAddOption }: GroupCardProps) {
  const [adding, setAdding] = useState(false);
  const [optName, setOptName] = useState("");
  const [optPrice, setOptPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAddOption() {
    const name = optName.trim();
    if (!name) return;
    const priceModifier = group.group_type === "allergy" ? 0 : (parseFloat(optPrice) || 0);
    setSaving(true);
    await onAddOption(group.id, name, priceModifier);
    setOptName("");
    setOptPrice("");
    setSaving(false);
    setAdding(false);
  }

  const sortedOptions = [...group.item_options].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="border border-[#E2DDD5] rounded-xl overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FAFAF8] border-b border-[#F4F1EC]">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[#16130C] truncate">{group.name}</p>
          <p className="text-[11px] text-[#9C9485]">
            {GROUP_TYPE_LABELS[group.group_type]}
            {group.is_required && " · Required"}
          </p>
        </div>
        <button
          onClick={() => onDeleteGroup(group.id, group.name)}
          className="text-[#E2DDD5] hover:text-[#DC2626] transition-colors text-[13px] shrink-0 px-1"
          title="Delete group"
        >
          🗑
        </button>
      </div>

      {/* Options */}
      <div className="divide-y divide-[#F4F1EC]">
        {sortedOptions.length === 0 && !adding && (
          <p className="text-[12px] text-[#9C9485] italic px-3 py-2">No options yet</p>
        )}
        {sortedOptions.map((opt) => (
          <OptionRow
            key={opt.id}
            option={opt}
            groupType={group.group_type}
            onDelete={(optId) => onDeleteOption(group.id, optId)}
            onToggleAvailable={(optId, cur) => onToggleOption(group.id, optId, cur)}
          />
        ))}

        {/* Add option form */}
        {adding ? (
          <div className="px-3 py-2.5 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={optName}
                onChange={(e) => setOptName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddOption(); if (e.key === "Escape") setAdding(false); }}
                placeholder={group.group_type === "allergy" ? "e.g. Contains nuts" : "e.g. Large"}
                className="flex-1 border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020]"
                autoFocus
              />
              {group.group_type !== "allergy" && (
                <input
                  type="number"
                  min={0}
                  value={optPrice}
                  onChange={(e) => setOptPrice(e.target.value)}
                  placeholder="+KSh"
                  className="w-[80px] border border-[#E2DDD5] rounded-lg px-3 py-1.5 text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020]"
                />
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddOption}
                disabled={saving || !optName.trim()}
                className="text-[12px] font-bold text-white bg-[#16130C] px-3 h-[28px] rounded-full hover:bg-[#2A2520] transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Add"}
              </button>
              <button
                onClick={() => { setAdding(false); setOptName(""); setOptPrice(""); }}
                className="text-[12px] text-[#9C9485] hover:text-[#16130C] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-left px-3 py-2 text-[12px] font-semibold text-[#E8A020] hover:bg-[#E8A020]/5 transition-colors"
          >
            + Add option
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main editor ───────────────────────────────────── */

export function OptionGroupEditor({ menuItemId, menuItemName, onClose, showToast, embedded = false }: OptionGroupEditorProps) {
  const [groups, setGroups] = useState<ItemOptionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Add group form
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] = useState<"single" | "multi" | "allergy">("single");
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);

  /* ── Load groups ───────────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/menu/options?menu_item_id=${menuItemId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setGroups(d.groups ?? []); })
      .catch(() => { if (!cancelled) showToast("Failed to load options", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [menuItemId, showToast]);

  /* ── Add group ─────────────────────────────────── */

  const handleAddGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setSavingGroup(true);
    try {
      const res = await fetch("/api/menu/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_group",
          menu_item_id: menuItemId,
          name,
          group_type: newGroupType,
          is_required: newGroupRequired,
          display_order: groups.length,
        }),
      });
      if (!res.ok) throw new Error();
      const { group } = await res.json();
      setGroups((prev) => [...prev, group]);
      setNewGroupName("");
      setNewGroupRequired(false);
      setShowAddGroup(false);
      showToast("Option group added");
    } catch {
      showToast("Failed to add group", "error");
    } finally {
      setSavingGroup(false);
    }
  }, [menuItemId, newGroupName, newGroupType, newGroupRequired, groups.length, showToast]);

  /* ── Allergen shortcut ─────────────────────────── */
  // Creates an "Allergens" allergy group + 7 common options in one click.

  const COMMON_ALLERGENS = [
    "Contains nuts",
    "Contains gluten",
    "Contains dairy",
    "Contains eggs",
    "Contains shellfish",
    "Contains soy",
    "Contains sesame",
  ];

  const [addingAllergens, setAddingAllergens] = useState(false);

  const handleAllergenShortcut = useCallback(async () => {
    // Don't add if an "Allergens" group already exists
    if (groups.some((g) => g.group_type === "allergy")) {
      showToast("An allergen group already exists on this item", "error");
      return;
    }
    setAddingAllergens(true);
    try {
      // 1. Create the group
      const grpRes = await fetch("/api/menu/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:       "create_group",
          menu_item_id: menuItemId,
          name:         "Allergens",
          group_type:   "allergy",
          is_required:  false,
          display_order: groups.length,
        }),
      });
      if (!grpRes.ok) throw new Error();
      const { group: newGroup } = await grpRes.json();

      // 2. Create all 7 allergen options in parallel
      const optionResults = await Promise.all(
        COMMON_ALLERGENS.map((name, i) =>
          fetch("/api/menu/options", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action:          "create_option",
              option_group_id: newGroup.id,
              name,
              price_modifier:  0,
              display_order:   i,
            }),
          }).then((r) => r.json())
        )
      );

      const createdOptions = optionResults
        .filter((r) => r.option)
        .map((r) => r.option);

      setGroups((prev) => [
        ...prev,
        { ...newGroup, item_options: createdOptions },
      ]);
      showToast("Allergen group added with 7 common allergens");
    } catch {
      showToast("Failed to add allergen group", "error");
    } finally {
      setAddingAllergens(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItemId, groups, showToast]);

  /* ── Delete group ──────────────────────────────── */

  const handleDeleteGroup = useCallback(async (groupId: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its options?`)) return;
    try {
      const res = await fetch("/api/menu/options", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "group", id: groupId }),
      });
      if (!res.ok) throw new Error();
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      showToast("Group deleted");
    } catch {
      showToast("Failed to delete group", "error");
    }
  }, [showToast]);

  /* ── Add option ────────────────────────────────── */

  const handleAddOption = useCallback(async (groupId: string, name: string, priceModifier: number) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    try {
      const res = await fetch("/api/menu/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_option",
          option_group_id: groupId,
          name,
          price_modifier: priceModifier,
          display_order: group.item_options.length,
        }),
      });
      if (!res.ok) throw new Error();
      const { option } = await res.json();
      setGroups((prev) => prev.map((g) =>
        g.id === groupId ? { ...g, item_options: [...g.item_options, option] } : g
      ));
    } catch {
      showToast("Failed to add option", "error");
      throw new Error("failed");
    }
  }, [groups, showToast]);

  /* ── Delete option ─────────────────────────────── */

  const handleDeleteOption = useCallback(async (groupId: string, optionId: string) => {
    try {
      const res = await fetch("/api/menu/options", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "option", id: optionId }),
      });
      if (!res.ok) throw new Error();
      setGroups((prev) => prev.map((g) =>
        g.id === groupId
          ? { ...g, item_options: g.item_options.filter((o) => o.id !== optionId) }
          : g
      ));
    } catch {
      showToast("Failed to delete option", "error");
    }
  }, [showToast]);

  /* ── Toggle option availability ────────────────── */

  const handleToggleOption = useCallback(async (groupId: string, optionId: string, current: boolean) => {
    // Optimistic
    setGroups((prev) => prev.map((g) =>
      g.id === groupId
        ? { ...g, item_options: g.item_options.map((o) => o.id === optionId ? { ...o, is_available: !current } : o) }
        : g
    ));
    try {
      const res = await fetch("/api/menu/options", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_option", option_id: optionId, is_available: !current }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback
      setGroups((prev) => prev.map((g) =>
        g.id === groupId
          ? { ...g, item_options: g.item_options.map((o) => o.id === optionId ? { ...o, is_available: current } : o) }
          : g
      ));
      showToast("Failed to update option", "error");
    }
  }, [showToast]);

  /* ── Render ────────────────────────────────────── */

  return (
    <div className={embedded ? "pt-4 mt-4 border-t border-[#F4F1EC]" : "bg-[#FAFAF8] border-t-2 border-[#E8A020]/40 px-4 py-4"}>
      {/* Header — hidden when embedded inside the edit form */}
      {!embedded && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-bold text-[#16130C]">
            Options for <span className="text-[#E8A020]">{menuItemName}</span>
          </p>
          <button
            onClick={onClose}
            className="text-[#9C9485] hover:text-[#16130C] transition-colors text-[12px] font-semibold"
          >
            Done ✕
          </button>
        </div>
      )}

      {embedded && (
        <p className="text-[12px] font-bold text-[#16130C] uppercase tracking-wide mb-3">
          Customisation options
        </p>
      )}

      {loading ? (
        <p className="text-[12px] text-[#9C9485] py-2">Loading…</p>
      ) : (
        <div className="space-y-3">
          {groups.length === 0 && !showAddGroup && (
            <p className="text-[12px] text-[#9C9485] italic">
              No customisation groups yet. Add one below.
            </p>
          )}

          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onDeleteGroup={handleDeleteGroup}
              onDeleteOption={handleDeleteOption}
              onToggleOption={handleToggleOption}
              onAddOption={handleAddOption}
            />
          ))}

          {/* Add group form */}
          {showAddGroup ? (
            <div className="border border-[#E2DDD5] rounded-xl p-3 bg-white space-y-2.5">
              <p className="text-[12px] font-bold text-[#16130C] uppercase tracking-wide">New option group</p>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder='e.g. "Size", "Extras"'
                className="w-full border border-[#E2DDD5] rounded-lg px-3 py-2 text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] bg-white"
                autoFocus
              />
              <div>
                <p className="text-[11px] font-semibold text-[#9C9485] mb-1.5 uppercase tracking-wide">Type</p>
                <div className="space-y-1">
                  {(["single", "multi", "allergy"] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={newGroupType === type}
                        onChange={() => setNewGroupType(type)}
                        className="accent-[#E8A020]"
                      />
                      <span className="text-[12px] text-[#16130C]">{GROUP_TYPE_LABELS[type]}</span>
                    </label>
                  ))}
                </div>
              </div>
              {(newGroupType === "single" || newGroupType === "multi") && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newGroupRequired}
                    onChange={(e) => setNewGroupRequired(e.target.checked)}
                    className="accent-[#E8A020]"
                  />
                  <span className="text-[12px] text-[#16130C]">Required (customer must choose)</span>
                </label>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddGroup}
                  disabled={savingGroup || !newGroupName.trim()}
                  className="text-[12px] font-bold text-white bg-[#16130C] px-4 h-[30px] rounded-full hover:bg-[#2A2520] transition-colors disabled:opacity-50"
                >
                  {savingGroup ? "Saving…" : "Add group"}
                </button>
                <button
                  onClick={() => { setShowAddGroup(false); setNewGroupName(""); }}
                  className="text-[12px] text-[#9C9485] hover:text-[#16130C] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddGroup(true)}
              className="w-full border border-dashed border-[#E2DDD5] rounded-xl py-2.5 text-[12px] font-semibold text-[#9C9485] hover:text-[#E8A020] hover:border-[#E8A020]/40 transition-colors"
            >
              + Add option group
            </button>
          )}
        </div>
      )}
    </div>
  );
}
