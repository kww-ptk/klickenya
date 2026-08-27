"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPERTY_STATUSES, STATUS_LABELS, type PropertyStatus } from "@/lib/real-estate/constants";

/**
 * Inline status control for the admin property table. Changing a property from
 * available to sold previously meant opening Sanity Studio in another tab.
 */
function PropertyStatusSelect({
  propertyId,
  status,
  title,
}: {
  propertyId: string;
  status: string;
  title: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleChange(next: string) {
    const previous = value;
    setValue(next);
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/real-estate/${propertyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();

      if (!res.ok) {
        setValue(previous);
        setError(data.error ?? "Update failed");
        return;
      }

      startTransition(() => router.refresh());
    } catch {
      setValue(previous);
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <select
          aria-label={`Status for ${title}`}
          value={value}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "rounded-lg border border-[#E8E4DE] bg-white px-2.5 py-1.5 text-[13px] font-medium text-dark outline-none",
            "focus:border-amber disabled:opacity-60"
          )}
        >
          {PROPERTY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s as PropertyStatus]}
            </option>
          ))}
        </select>
        {saving && <Loader2 className="size-3.5 animate-spin text-text3" />}
      </div>
      {error && <span className="text-[11px] text-[#EF4444]">{error}</span>}
    </div>
  );
}

export { PropertyStatusSelect };
