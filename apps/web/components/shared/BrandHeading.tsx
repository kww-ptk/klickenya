import { cn } from "@/lib/utils";
import { SwooshDivider } from "./SwooshDivider";

interface BrandHeadingProps {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  swooshSize?: "sm" | "md" | "lg";
  className?: string;
}

function BrandHeading({
  children,
  as: Tag = "h2",
  swooshSize = "sm",
  className,
}: BrandHeadingProps) {
  return (
    <div className="relative inline-block">
      <Tag
        className={cn(
          "font-display font-bold tracking-[-0.03em] text-text",
          Tag === "h1" && "text-[clamp(32px,5vw,56px)]",
          Tag === "h2" && "text-[clamp(22px,3vw,34px)]",
          Tag === "h3" && "text-[20px]",
          className
        )}
      >
        {children}
      </Tag>
      <div className="absolute -bottom-2 left-0">
        <SwooshDivider size={swooshSize} opacity={0.5} />
      </div>
    </div>
  );
}

export { BrandHeading };
