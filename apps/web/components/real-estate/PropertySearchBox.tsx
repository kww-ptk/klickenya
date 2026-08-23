"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES } from "@/lib/real-estate/constants";

/**
 * Hero search.
 *
 * Two things were broken here. The box built a query string that the category
 * pages never read, so every search returned the unfiltered category; that is
 * fixed on the receiving end by PropertyBrowser. And the "New Developments" tab
 * pushed to /real-estate/new-builds, which is not a category, so it fell
 * through to the property detail branch and 404ed.
 *
 * Layout is now a wrapping grid. The old single flex row squeezed five fields
 * and a button into whatever width was available, which was unusable on a
 * phone. Fields are 16px so iOS Safari does not zoom on focus.
 */

const TABS = [
  { id: "for-sale", href: "/real-estate/for-sale", icon: "🏠", label: "Buy" },
  { id: "for-rent", href: "/real-estate/for-rent", icon: "🔑", label: "Rent" },
  { id: "land", href: "/real-estate/land", icon: "🌍", label: "Land" },
  { id: "commercial", href: "/real-estate/commercial", icon: "🏢", label: "Commercial" },
  {
    id: "new-developments",
    href: "/real-estate/new-developments",
    icon: "🏗",
    label: "New Developments",
  },
] as const;

const fieldCls =
  "w-full bg-transparent text-[16px] font-medium text-text outline-none placeholder:text-text3";

// text-left is explicit: the hero centres its content, and the fields would
// otherwise inherit centred labels and centred placeholder text.
const wrapCls =
  "flex flex-col gap-0.5 rounded-[14px] border border-border px-4 py-2.5 text-left transition-colors focus-within:border-purple2";

const labelCls =
  "text-[10px] font-bold uppercase tracking-[0.06em] text-text";

function PropertySearchBox() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("for-sale");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const params = new URLSearchParams();
    if (location.trim()) params.set("city", location.trim());
    if (propertyType) params.set("type", propertyType);
    if (bedrooms) params.set("beds", bedrooms);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);

    const target = TABS.find((t) => t.id === activeTab)?.href ?? "/real-estate/for-sale";
    const qs = params.toString();
    router.push(qs ? `${target}?${qs}` : target);
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search properties"
      className="w-full max-w-[880px] overflow-hidden rounded-[26px] bg-white/97 shadow-xl backdrop-blur-[20px]"
    >
      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border px-1.5 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 px-4 py-3.5 text-[13px] font-semibold transition-colors duration-200",
                isActive
                  ? "border-purple2 text-purple2"
                  : "border-transparent text-text3 hover:text-text"
              )}
            >
              <span aria-hidden="true">{tab.icon}</span> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 items-stretch gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.85fr_1.3fr_auto]">
        <div className={wrapCls}>
          <label className={labelCls} htmlFor="search-location">
            Location
          </label>
          <input
            id="search-location"
            type="text"
            placeholder="Nairobi, Mombasa..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={fieldCls}
          />
        </div>

        <div className={wrapCls}>
          <label className={labelCls} htmlFor="search-type">
            Property type
          </label>
          <select
            id="search-type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className={cn(fieldCls, "cursor-pointer appearance-none")}
          >
            <option value="">Any type</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className={wrapCls}>
          <label className={labelCls} htmlFor="search-beds">
            Bedrooms
          </label>
          <select
            id="search-beds"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className={cn(fieldCls, "cursor-pointer appearance-none")}
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>

        <div className={wrapCls}>
          <span className={labelCls}>Price range (KSh)</span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Minimum price"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
              className={fieldCls}
            />
            <span className="text-[13px] text-text3" aria-hidden="true">
              to
            </span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Maximum price"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
              className={fieldCls}
            />
          </div>
        </div>

        <button
          type="submit"
          className="col-span-full flex h-[52px] items-center justify-center gap-2 self-center rounded-[18px] bg-purple2 px-7 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(139,77,171,0.35)] transition-all duration-200 hover:bg-[#9B5ABF] lg:col-span-1"
        >
          <Search className="size-4" />
          Search
        </button>
      </div>
    </form>
  );
}

export { PropertySearchBox };
