import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-amber text-dark rounded-full shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-dark text-white rounded-full hover:opacity-85 active:opacity-75",
        ghost:
          "text-text2 rounded-full hover:bg-surface hover:text-text active:bg-surface2",
        outline:
          "border border-border text-text rounded-full hover:border-dark hover:shadow-sm active:bg-surface",
      },
      size: {
        sm: "px-4 py-1.5 text-[13px]",
        md: "px-5 py-2.5 text-[14px]",
        lg: "px-7 py-3.5 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);

Button.displayName = "Button";

export { Button, buttonVariants };
