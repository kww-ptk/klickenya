"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "for-sale", icon: "\uD83C\uDFE0", label: "Buy" },
  { id: "for-rent", icon: "\uD83D\uDD11", label: "Rent" },
  { id: "land", icon: "\uD83C\uDF0D", label: "Land" },
  { id: "commercial", icon: "\uD83C\uDFE2", label: "Commercial" },
  { id: "new-builds", icon: "\uD83C\uDFD7", label: "New Developments" },
];

function PropertySearchBox() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("for-sale");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  function handleSearch() {
    const params = new URLSearchParams();
    if (location.trim()) params.set("city", location.toLowerCase().trim());
    if (propertyType) params.set("type", propertyType);
    if (bedrooms) params.set("beds", bedrooms);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);

    const qs = params.toString();
    router.push(`/real-estate/${activeTab}${qs ? "?" + qs : ""}`);
  }

  return (
    <div className="w-full max-w-[860px] bg-white/97 backdrop-blur-[20px] rounded-[30px] shadow-xl overflow-hidden">
      {/* Tabs row */}
      <div className="flex border-b border-border px-1.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 px-4.5 py-3.5 text-[13px] font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap",
                isActive
                  ? "text-purple2 border-purple2"
                  : "text-text3 border-transparent hover:text-text"
              )}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* Fields row */}
      <div className="flex items-stretch gap-0 p-2.5 pl-0">
        {/* Location */}
        <div className="flex-1 flex flex-col gap-0.5 px-4 py-2.5 border-r border-border rounded-[12px] hover:bg-surface cursor-text transition-colors duration-150">
          <label className="text-[10px] font-bold text-text uppercase tracking-[0.05em]">
            Location
          </label>
          <input
            type="text"
            placeholder="Nairobi, Mombasa..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="text-[14px] font-medium text-text2 bg-transparent outline-none placeholder:text-text3"
          />
        </div>

        {/* Property type */}
        <div className="flex-1 flex flex-col gap-0.5 px-4 py-2.5 border-r border-border rounded-[12px] hover:bg-surface cursor-text transition-colors duration-150">
          <label className="text-[10px] font-bold text-text uppercase tracking-[0.05em]">
            Property Type
          </label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="text-[14px] font-medium text-text2 bg-transparent outline-none appearance-none cursor-pointer"
          >
            <option value="">Any type</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="villa">Villa</option>
            <option value="townhouse">Townhouse</option>
            <option value="penthouse">Penthouse</option>
            <option value="studio">Studio</option>
          </select>
        </div>

        {/* Bedrooms */}
        <div className="flex-1 flex flex-col gap-0.5 px-4 py-2.5 border-r border-border rounded-[12px] hover:bg-surface cursor-text transition-colors duration-150">
          <label className="text-[10px] font-bold text-text uppercase tracking-[0.05em]">
            Bedrooms
          </label>
          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="text-[14px] font-medium text-text2 bg-transparent outline-none appearance-none cursor-pointer"
          >
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
        </div>

        {/* Price range */}
        <div className="flex-1 flex flex-col gap-0.5 px-4 py-2.5 border-r border-border rounded-[12px] hover:bg-surface cursor-text transition-colors duration-150">
          <label className="text-[10px] font-bold text-text uppercase tracking-[0.05em]">
            Price Range
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full text-[14px] font-medium text-text2 bg-transparent outline-none placeholder:text-text3"
            />
            <span className="text-text3 text-[13px]">&mdash;</span>
            <input
              type="text"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full text-[14px] font-medium text-text2 bg-transparent outline-none placeholder:text-text3"
            />
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          className="shrink-0 h-[52px] px-7 rounded-[22px] bg-purple2 text-white text-[14px] font-bold flex items-center gap-2 shadow-[0_4px_16px_rgba(139,77,171,0.35)] hover:bg-[#9B5ABF] hover:scale-[1.02] transition-all duration-200 self-center mr-0.5"
        >
          <Search className="size-4" />
          Search
        </button>
      </div>
    </div>
  );
}

export { PropertySearchBox };
