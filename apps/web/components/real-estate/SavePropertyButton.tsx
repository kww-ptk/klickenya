"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedProperties } from "@/lib/real-estate/useSavedProperties";

interface SavePropertyButtonProps {
  propertyId: string;
  propertyTitle: string;
  /** "overlay" sits on the card photo; "inline" sits in the detail sidebar. */
  variant?: "overlay" | "inline";
  className?: string;
}

function SavePropertyButton({
  propertyId,
  propertyTitle,
  variant = "overlay",
  className,
}: SavePropertyButtonProps) {
  const { toggle, isSaved } = useSavedProperties();
  const saved = isSaved(propertyId);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={
        saved ? `Remove ${propertyTitle} from saved` : `Save ${propertyTitle}`
      }
      onClick={(e) => {
        // The card is one big link; without this the click navigates instead.
        e.preventDefault();
        e.stopPropagation();
        toggle(propertyId);
      }}
      className={cn(
        "flex items-center justify-center transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple2 focus-visible:ring-offset-2",
        variant === "overlay"
          ? "size-9 rounded-full bg-white/25 backdrop-blur-[8px] hover:bg-white/40 hover:scale-110 active:scale-95"
          : "gap-2 h-11 px-4 rounded-[14px] border border-border bg-white text-[14px] font-semibold text-text2 hover:border-text3",
        className
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          saved
            ? "fill-[#EF4444] text-[#EF4444]"
            : variant === "overlay"
              ? "text-white"
              : "text-text3"
        )}
        strokeWidth={2}
        style={
          variant === "overlay" && !saved
            ? { filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.35))" }
            : undefined
        }
      />
      {variant === "inline" && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}

export { SavePropertyButton };
