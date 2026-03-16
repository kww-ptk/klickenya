import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[10.5px] font-bold uppercase tracking-[0.04em] text-text"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full rounded-[var(--radius-md)] border bg-white px-4 py-3 text-[14px] font-medium text-text outline-none transition-all duration-200 resize-y min-h-[120px]",
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

Textarea.displayName = "Textarea";

export { Textarea };
