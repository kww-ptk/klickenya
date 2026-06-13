"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type"> {
  checked: boolean;
  onChange: () => void;
  label?: string;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, disabled, label, className, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        disabled={disabled}
        className={cn(
          "relative inline-flex shrink-0 items-center box-border",
          "w-10 h-[22px] p-[2px] rounded-full",
          "transition-colors duration-200 ease-out cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green/40",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          checked ? "bg-green" : "bg-border",
          className,
        )}
        {...rest}
      >
        <span
          aria-hidden="true"
          className={cn(
            "block size-[18px] rounded-full bg-white shadow",
            "transition-transform duration-200 ease-out",
            "will-change-transform",
            checked ? "translate-x-[18px]" : "translate-x-0",
          )}
        />
      </button>
    );
  },
);

Toggle.displayName = "Toggle";

export default Toggle;
