"use client";

import { useState, useCallback } from "react";

/* ── Types ─────────────────────────────────────────── */

interface ImportedItem {
  name: string;
  description: string;
  price_kes: number;
  dietary_tags: string[];
}

interface ImportedSection {
  title: string;
  items: ImportedItem[];
}

/* ── Constants ─────────────────────────────────────── */

const MAX_CHARS = 15000;

// Short codes must match TAG_STYLES in MenuDisplay.tsx and DIETARY_OPTIONS in ItemForm.tsx
const DIETARY_OPTIONS = [
  { tag: "V",  label: "Vegetarian" },
  { tag: "VG", label: "Vegan" },
  { tag: "GF", label: "Gluten-free" },
  { tag: "H",  label: "Halal" },
  { tag: "S",  label: "Spicy" },
  { tag: "DF", label: "Lactose Free" },
];

const EXAMPLE_CHIPS = [
  {
    label: "Typed list",
    text: `Starters\nSoup of the day 350\nGarlic bread 200\n\nMains\nGrilled chicken 850\nBeef burger 750\nVeg pasta (Vegetarian) 650\n\nDrinks\nSoda 100\nJuice 150`,
  },
  {
    label: "Photo / PDF text",
    text: `MENU\n\nBREAKFAST\nFull English Breakfast KSh 1,200 — eggs, bacon, sausage, beans, toast\nAvocado Toast KSh 850 (Vegetarian, Vegan) — sourdough, smashed avo, cherry tomatoes\nFresh Fruit Bowl KSh 600 (Vegan, Gluten-free)\n\nLUNCH\nChicken Tikka Masala KSh 1,100 (Halal, Spicy)\nVegetable Biryani KSh 900 (Vegetarian, Halal)\nCaesar Salad KSh 750`,
  },
  {
    label: "WhatsApp list",
    text: `Our menu prices (updated April 2025)\n\nChapati - 30\nUgali - 50\nNyama choma (500g) - 800\nFish fillet - 650\nMixed veg stew - 350\nRice - 100\nTea / Coffee - 80\nSoda - 100\nMandazi (3 pcs) - 60`,
  },
];

/* ── Props ─────────────────────────────────────────── */

interface MenuImporterProps {
  menuId: string;
  onComplete: () => void;
  onClose: () => void;
}

/* ── Component ─────────────────────────────────────── */

export function MenuImporter({ menuId, onComplete, onClose }: MenuImporterProps) {
  const [step, setStep] = useState<"paste" | "review" | "done">("paste");
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [sections, setSections] = useState<ImportedSection[]>([]);
  const [summary, setSummary] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created_sections: number; created_items: number } | null>(null);

  /* ── Step 1 → 2: parse ─────────────────────────────── */

  const handleParse = useCallback(async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    setParseError(null);

    try {
      const res = await fetch("/api/menu/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", menu_id: menuId, raw_text: rawText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error ?? "Failed to parse menu");
        return;
      }

      setSections(data.sections);
      setSummary(data.summary ?? "");
      setStep("review");
    } catch {
      setParseError("Network error — please try again");
    } finally {
      setParsing(false);
    }
  }, [menuId, rawText]);

  /* ── Step 2 → 3: commit ─────────────────────────────── */

  const handleCommit = useCallback(async () => {
    const nonEmpty = sections.filter((s) => s.title.trim() && s.items.some((i) => i.name.trim()));
    if (nonEmpty.length === 0) return;

    setCommitting(true);
    setCommitError(null);

    try {
      const res = await fetch("/api/menu/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", menu_id: menuId, sections: nonEmpty }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCommitError(data.error ?? "Failed to import menu");
        return;
      }

      setResult(data);
      setStep("done");
    } catch {
      setCommitError("Network error — please try again");
    } finally {
      setCommitting(false);
    }
  }, [menuId, sections]);

  /* ── Section / item editors ─────────────────────────── */

  const updateSectionTitle = (si: number, title: string) => {
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, title } : s)));
  };

  const removeSection = (si: number) => {
    setSections((prev) => prev.filter((_, i) => i !== si));
  };

  const updateItem = (si: number, ii: number, patch: Partial<ImportedItem>) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i !== si
          ? s
          : { ...s, items: s.items.map((item, j) => (j !== ii ? item : { ...item, ...patch })) }
      )
    );
  };

  const removeItem = (si: number, ii: number) => {
    setSections((prev) =>
      prev.map((s, i) => (i !== si ? s : { ...s, items: s.items.filter((_, j) => j !== ii) }))
    );
  };

  const addItem = (si: number) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i !== si
          ? s
          : {
              ...s,
              items: [
                ...s.items,
                { name: "", description: "", price_kes: 0, dietary_tags: [] },
              ],
            }
      )
    );
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { title: "New section", items: [{ name: "", description: "", price_kes: 0, dietary_tags: [] }] },
    ]);
  };

  const toggleTag = (si: number, ii: number, tag: string) => {
    const item = sections[si]?.items[ii];
    if (!item) return;
    const has = item.dietary_tags.includes(tag);
    updateItem(si, ii, {
      dietary_tags: has
        ? item.dietary_tags.filter((t) => t !== tag)
        : [...item.dietary_tags, tag],
    });
  };

  /* ── Derived ────────────────────────────────────────── */

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const zeroPriceCount = sections.reduce(
    (sum, s) => sum + s.items.filter((i) => i.price_kes === 0).length,
    0
  );

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[20px]">📋</span>
          <div>
            <h2 className="font-display text-[18px] font-bold text-dark">Import menu</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {(["paste", "review", "done"] as const).map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-border text-[11px]">›</span>}
                  <span
                    className={`text-[11px] font-semibold ${
                      step === s ? "text-amber" : "text-text3"
                    }`}
                  >
                    {i + 1}. {s === "paste" ? "Paste" : s === "review" ? "Review" : "Done"}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text3 hover:text-dark hover:bg-surface transition-colors text-[18px]"
          aria-label="Close importer"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Step 1: Paste ─────────────────────────── */}
        {step === "paste" && (
          <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
            <p className="text-[14px] text-text2">
              Paste your menu text below — from a photo, PDF, WhatsApp message, or typed list. Our AI will extract sections and items automatically.
            </p>

            {/* Example chips */}
            <div>
              <p className="text-[11px] font-semibold text-text3 uppercase tracking-wide mb-2">Load example</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => setRawText(chip.text)}
                    className="text-[12px] font-semibold text-text2 border border-border rounded-full px-3 h-[28px] hover:border-amber/60 hover:text-amber transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value.slice(0, MAX_CHARS))}
                placeholder={"Starters\nSoup of the day 350\nGarlic bread 200\n\nMains\nGrilled chicken 850\n..."}
                rows={16}
                className="w-full border border-border rounded-xl px-4 py-3 text-[13px] text-dark placeholder:text-[#C5BFB5] focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 bg-white resize-none font-mono"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[11px] text-text3">
                  {rawText.length > 0 && rawText.length >= MAX_CHARS * 0.9
                    ? <span className="text-[#DC2626] font-semibold">{rawText.length}/{MAX_CHARS}</span>
                    : <span>{rawText.length}/{MAX_CHARS}</span>
                  }
                </span>
                {rawText.length > 0 && (
                  <button
                    onClick={() => setRawText("")}
                    className="text-[11px] text-text3 hover:text-[#DC2626] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {parseError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-[13px] text-red-700 font-semibold">{parseError}</p>
              </div>
            )}

            <button
              onClick={handleParse}
              disabled={!rawText.trim() || parsing}
              className="w-full h-[44px] rounded-full bg-amber text-dark text-[14px] font-bold hover:bg-[#d4911c] transition-colors disabled:opacity-50"
            >
              {parsing ? "Parsing menu…" : "Parse menu →"}
            </button>

            {parsing && (
              <p className="text-center text-[12px] text-text3">
                This usually takes 5–15 seconds
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: Review ────────────────────────── */}
        {step === "review" && (
          <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
            {summary && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-[13px] text-emerald-800">{summary}</p>
              </div>
            )}

            {zeroPriceCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-[13px] text-amber-800">
                  <span className="font-semibold">Heads up:</span> {zeroPriceCount} item{zeroPriceCount !== 1 ? "s have" : " has"} a price of KSh 0. Check and update before importing.
                </p>
              </div>
            )}

            <p className="text-[13px] text-text2">
              Review and edit the extracted items before importing. Changes here don't affect your live menu until you click Import.
            </p>

            {sections.map((section, si) => (
              <div
                key={si}
                className="bg-white border border-border rounded-xl shadow-sm overflow-hidden"
              >
                {/* Section header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-surface bg-canvas">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSectionTitle(si, e.target.value)}
                    className="flex-1 text-[14px] font-bold text-dark bg-transparent border-b border-transparent focus:border-amber outline-none py-0.5"
                    placeholder="Section name"
                  />
                  <button
                    onClick={() => removeSection(si)}
                    className="text-border hover:text-[#DC2626] transition-colors text-[14px] px-1 shrink-0"
                    title="Remove section"
                  >
                    🗑
                  </button>
                </div>

                {/* Items */}
                <div className="divide-y divide-surface">
                  {section.items.map((item, ii) => (
                    <ItemRow
                      key={ii}
                      item={item}
                      onChange={(patch) => updateItem(si, ii, patch)}
                      onDelete={() => removeItem(si, ii)}
                      onToggleTag={(tag) => toggleTag(si, ii, tag)}
                    />
                  ))}
                </div>

                {/* Add item */}
                <button
                  onClick={() => addItem(si)}
                  className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-amber hover:bg-amber/5 transition-colors"
                >
                  + Add item
                </button>
              </div>
            ))}

            {/* Add section */}
            <button
              onClick={addSection}
              className="w-full border border-dashed border-border rounded-xl py-3 text-[13px] font-semibold text-text3 hover:text-amber hover:border-amber/40 transition-colors"
            >
              + Add section
            </button>

            {commitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-[13px] text-red-700 font-semibold">{commitError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("paste"); setCommitError(null); }}
                className="flex-1 h-[44px] rounded-full border border-border text-[14px] font-semibold text-text2 hover:border-text3 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleCommit}
                disabled={committing || totalItems === 0}
                className="flex-[2] h-[44px] rounded-full bg-amber text-dark text-[14px] font-bold hover:bg-[#d4911c] transition-colors disabled:opacity-50"
              >
                {committing ? "Importing…" : `Import ${totalItems} item${totalItems !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ──────────────────────────── */}
        {step === "done" && result && (
          <div className="max-w-md mx-auto px-5 py-12 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <span className="text-[32px]">✓</span>
            </div>
            <div>
              <h3 className="font-display text-[20px] font-bold text-dark mb-2">
                Menu imported!
              </h3>
              <p className="text-[14px] text-text2">
                Added{" "}
                <span className="font-semibold text-dark">
                  {result.created_sections} section{result.created_sections !== 1 ? "s" : ""}
                </span>{" "}
                and{" "}
                <span className="font-semibold text-dark">
                  {result.created_items} item{result.created_items !== 1 ? "s" : ""}
                </span>{" "}
                to your menu.
              </p>
            </div>
            <p className="text-[12px] text-text3">
              Prices, descriptions, and options can be edited in the menu builder.
            </p>
            <button
              onClick={onComplete}
              className="w-full h-[44px] rounded-full bg-dark text-white text-[14px] font-bold hover:bg-[#2A2520] transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ItemRow sub-component ─────────────────────────── */

function ItemRow({
  item,
  onChange,
  onDelete,
  onToggleTag,
}: {
  item: ImportedItem;
  onChange: (patch: Partial<ImportedItem>) => void;
  onDelete: () => void;
  onToggleTag: (tag: string) => void;
}) {
  const [showTags, setShowTags] = useState(false);

  return (
    <div className="px-4 py-3 space-y-2">
      {/* Row 1: name + price + delete */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Item name"
          className="flex-1 min-w-0 border border-border rounded-lg px-2.5 py-1.5 text-[13px] text-dark placeholder:text-[#C5BFB5] focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/20 bg-white"
        />
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[12px] text-text3">KSh</span>
          <input
            type="number"
            value={item.price_kes}
            onChange={(e) => onChange({ price_kes: Math.max(0, Number(e.target.value)) })}
            min={0}
            className={`w-[80px] border rounded-lg px-2 py-1.5 text-[13px] font-semibold focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/20 bg-white text-right ${
              item.price_kes === 0
                ? "border-amber-300 text-amber-700"
                : "border-border text-dark"
            }`}
          />
        </div>
        <button
          onClick={onDelete}
          className="text-border hover:text-[#DC2626] transition-colors text-[13px] shrink-0 px-0.5"
          title="Remove item"
        >
          ✕
        </button>
      </div>

      {/* Row 2: description */}
      <input
        type="text"
        value={item.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description (optional)"
        className="w-full border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-text2 placeholder:text-[#C5BFB5] focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/20 bg-white"
      />

      {/* Row 3: dietary tags */}
      <div>
        {item.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {item.dietary_tags.map((tag) => {
              const opt = DIETARY_OPTIONS.find((o) => o.tag === tag);
              return (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 h-[20px] hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                  title="Click to remove"
                >
                  {opt?.label ?? tag} ×
                </button>
              );
            })}
          </div>
        )}
        <button
          onClick={() => setShowTags((v) => !v)}
          className="text-[11px] font-semibold text-text3 hover:text-amber transition-colors"
        >
          {showTags ? "▲ Hide tags" : "▼ Add dietary tags"}
        </button>
        {showTags && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {DIETARY_OPTIONS.map(({ tag, label }) => {
              const active = item.dietary_tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  className={`text-[11px] font-semibold rounded-full px-2 h-[22px] border transition-colors ${
                    active
                      ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                      : "text-text2 bg-white border-border hover:border-emerald-300 hover:text-emerald-700"
                  }`}
                >
                  {active ? `✓ ${label}` : label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
