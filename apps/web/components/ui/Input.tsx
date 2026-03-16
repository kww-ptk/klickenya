import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[10.5px] font-bold uppercase tracking-[0.04em] text-text"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-[var(--radius-md)] border bg-white px-4 py-3 text-[14px] font-medium text-text outline-none transition-all duration-200",
            "placeholder:text-text3",
            "focus:border-amber focus:ring-2 focus:ring-amber-dim",
            error
              ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[rgba(220,38,38,0.1)]"
              : "border-border hover:border-[#D8D3CC]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[12.5px] font-medium text-[#DC2626]">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-[12.5px] text-text3">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
