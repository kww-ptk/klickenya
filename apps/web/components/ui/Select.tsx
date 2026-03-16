import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-[10.5px] font-bold uppercase tracking-[0.04em] text-text"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full appearance-none rounded-[var(--radius-md)] border bg-white px-4 py-3 pr-10 text-[14px] font-medium text-text outline-none transition-all duration-200 cursor-pointer",
              "focus:border-amber focus:ring-2 focus:ring-amber-dim",
              error
                ? "border-[#DC2626]"
                : "border-border hover:border-[#D8D3CC]",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-text3" />
        </div>
        {error && (
          <p className="text-[12.5px] font-medium text-[#DC2626]">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
