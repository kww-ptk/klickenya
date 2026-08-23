"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Debounced search box that writes its value into the URL, so the server
 * component doing the filtering re-runs and the result stays linkable.
 */
function AdminTableSearch({
  placeholder = "Search",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(current);
  const [lastCurrent, setLastCurrent] = useState(current);

  // Filter tab links carry the current search through, so the box has to follow
  // the URL when it changes from outside. Adjusting during render is React's
  // documented pattern for this; doing it in an effect causes a second render.
  if (current !== lastCurrent) {
    setLastCurrent(current);
    setValue(current);
  }

  useEffect(() => {
    if (value === current) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set(paramName, value.trim());
      else params.delete(paramName);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [value, current, pathname, paramName, router, searchParams]);

  return (
    <div className="relative max-w-[420px]">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text3" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-[#E8E4DE] bg-white py-2.5 pl-10 pr-9 text-[16px] text-dark outline-none transition-colors focus:border-amber placeholder:text-text3"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-dark"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export { AdminTableSearch };
