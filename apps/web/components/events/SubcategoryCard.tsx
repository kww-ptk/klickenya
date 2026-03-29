import Link from "next/link";

interface SubcategoryCardProps {
  subcategory: string;
  label: string;
  emoji: string;
  count: number;
}

function SubcategoryCard({ subcategory, label, emoji, count }: SubcategoryCardProps) {
  return (
    <Link
      href={`/events?sub=${subcategory}`}
      className="group flex items-center gap-4 rounded-[16px] border border-border bg-white p-4 hover:shadow-md hover:border-amber-200 transition-all duration-300"
    >
      <span className="text-[28px] shrink-0">{emoji}</span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-text group-hover:text-amber-600 transition-colors truncate">
          {label}
        </p>
        <p className="text-[12px] text-text2">
          {count} {count === 1 ? "event" : "events"}
        </p>
      </div>
    </Link>
  );
}

export { SubcategoryCard };
export type { SubcategoryCardProps };
