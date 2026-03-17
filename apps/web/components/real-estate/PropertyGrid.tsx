import { cn } from "@/lib/utils";

interface PropertyGridProps {
  children: React.ReactNode;
  variant?: "featured" | "standard";
}

function PropertyGrid({ children, variant = "standard" }: PropertyGridProps) {
  return (
    <div
      className={cn(
        variant === "featured"
          ? [
              "grid gap-5",
              "grid-cols-1",
              "min-[768px]:grid-cols-[1fr_1fr]",
              "min-[1100px]:grid-cols-[1.5fr_1fr] min-[1100px]:grid-rows-[auto_auto]",
              "[&>*:first-child]:min-[1100px]:row-span-2",
            ]
          : "grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-x-5 gap-y-6"
      )}
    >
      {children}
    </div>
  );
}

export { PropertyGrid };
export type { PropertyGridProps };
