import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold",
  {
    variants: {
      variant: {
        default: "bg-surface2 text-text2 border border-border",
        amber:
          "bg-amber-dim text-amber border border-[rgba(232,160,32,0.25)]",
        green:
          "bg-[rgba(22,163,74,0.08)] text-green border border-[rgba(22,163,74,0.2)]",
        teal: "bg-[rgba(13,115,119,0.08)] text-teal border border-[rgba(13,115,119,0.2)]",
        red: "bg-[rgba(220,38,38,0.08)] text-[#DC2626] border border-[rgba(220,38,38,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
