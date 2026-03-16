import { cn } from "@/lib/utils";

interface SwooshDividerProps {
  size?: "sm" | "md" | "lg" | "xl";
  opacity?: number;
  color?: string;
  rotation?: number;
  className?: string;
}

const sizeMap = {
  sm: { width: 120, height: 20 },
  md: { width: 200, height: 32 },
  lg: { width: 320, height: 48 },
  xl: { width: 500, height: 72 },
};

function SwooshDivider({
  size = "md",
  opacity = 1,
  color = "var(--color-amber)",
  rotation = 0,
  className,
}: SwooshDividerProps) {
  const { width, height } = sizeMap[size];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 32"
      fill="none"
      className={cn("block", className)}
      style={{ opacity, transform: rotation ? `rotate(${rotation}deg)` : undefined }}
      aria-hidden="true"
    >
      <path
        d="M0 28C30 28 40 4 100 4C160 4 170 28 200 28"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export { SwooshDivider };
