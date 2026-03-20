import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  /** URL-level type segment, e.g. "stays" */
  type: string;
  /** Human label, e.g. "Stays" */
  typeLabel: string;
  /** Display city name, e.g. "Diani Beach" */
  city: string;
  /** URL-safe city slug, e.g. "diani-beach" */
  citySlug: string;
  /** Listing title shown as the final crumb */
  listingTitle: string;
}

function Breadcrumb({
  type,
  typeLabel,
  city,
  citySlug,
  listingTitle,
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex items-center gap-1.5 text-[13.5px] text-text2">
        <li>
          <Link href="/" className="hover:text-text transition-colors">
            Home
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3 text-text3" />
        </li>
        <li>
          <Link
            href={`/${type}`}
            className="hover:text-text transition-colors"
          >
            {typeLabel}
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3 text-text3" />
        </li>
        <li>
          <Link
            href={`/${type}/${citySlug}`}
            className="hover:text-text transition-colors"
          >
            {city}
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3 text-text3" />
        </li>
        <li className="font-semibold text-text line-clamp-1">
          {listingTitle}
        </li>
      </ol>
    </nav>
  );
}

export { Breadcrumb };
export type { BreadcrumbProps };
