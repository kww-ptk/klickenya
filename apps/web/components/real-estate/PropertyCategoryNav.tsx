import Link from "next/link";
import { cn } from "@/lib/utils";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";
import { PROPERTY_CATEGORIES, CATEGORY_LABELS, categoryPath } from "@/lib/real-estate/constants";

/**
 * Category navigation.
 *
 * This was a client component whose tabs called setState and nothing else, so
 * none of them navigated anywhere. It also offered Luxury and Student tabs with
 * no matching data, plus a sort dropdown and a "Map view" button that were both
 * inert. Sorting now lives in PropertyBrowser, where it works.
 */

interface PropertyCategoryNavProps {
  activeCategory?: string;
}

const ICONS: Record<string, string> = {
  all: "✨",
  "for-sale": "🏠",
  "for-rent": "🔑",
  land: "🌍",
  commercial: "🏢",
  "new-developments": "🏗",
};

function PropertyCategoryNav({ activeCategory }: PropertyCategoryNavProps) {
  const tabs = [
    { id: "all", label: "All", href: "/real-estate" },
    ...PROPERTY_CATEGORIES.map((c) => ({
      id: c,
      label: CATEGORY_LABELS[c],
      href: categoryPath(c),
    })),
    {
      id: "new-developments",
      label: "New Builds",
      href: "/real-estate/new-developments",
    },
  ];

  return (
    <nav
      aria-label="Property categories"
      className="sticky top-[65px] z-[200] border-b border-border bg-white/97 backdrop-blur-[20px]"
    >
      <div className="flex items-center gap-3 pr-3">
      <ul className="flex flex-1 items-stretch overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <li key={tab.id}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-[80px] shrink-0 cursor-pointer flex-col items-center gap-1.5 border-b-2 px-5 py-3 transition-all duration-200",
                  isActive
                    ? "border-purple2 opacity-100"
                    : "border-transparent opacity-55 hover:opacity-100"
                )}
              >
                <span className="text-[20px] leading-none" aria-hidden="true">
                  {ICONS[tab.id]}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-[12px] font-semibold",
                    isActive ? "text-purple2" : "text-text2"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Prices across the marketplace are quoted in whatever the seller uses,
          so the control that reconciles them belongs next to the browse tabs. */}
      <CurrencySwitcher className="hidden shrink-0 sm:block" />
      </div>
    </nav>
  );
}

export { PropertyCategoryNav };
export type { PropertyCategoryNavProps };
