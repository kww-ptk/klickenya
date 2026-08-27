import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, type Crumb } from "@/lib/real-estate/schema";

/**
 * One breadcrumb trail for every real-estate page. Each page used to hand-roll
 * its own <ol> and none of them emitted the matching BreadcrumbList.
 */
function Breadcrumbs({
  crumbs,
  className = "mb-6",
}: {
  crumbs: Crumb[];
  className?: string;
}) {
  return (
    <>
      <JsonLd schema={breadcrumbSchema(crumbs)} />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-1.5 text-[13.5px] text-text2">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={`${crumb.name}-${i}`} className="flex items-center gap-1.5">
                {crumb.path && !last ? (
                  <Link href={crumb.path} className="transition-colors hover:text-text">
                    {crumb.name}
                  </Link>
                ) : (
                  <span
                    className={last ? "line-clamp-1 font-semibold text-text" : undefined}
                    aria-current={last ? "page" : undefined}
                  >
                    {crumb.name}
                  </span>
                )}
                {!last && <ChevronRight className="size-3 text-text3" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

export { Breadcrumbs };
