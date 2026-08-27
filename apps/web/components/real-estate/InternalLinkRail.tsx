import Link from "next/link";

/**
 * Internal-link rails. The /real-estate/[category]/[city] pages are
 * pre-rendered but nothing on the site linked to them, so they had no path for
 * crawlers and no path for users either.
 */

export interface RailLink {
  label: string;
  href: string;
  count?: number;
}

function InternalLinkRail({
  title,
  links,
  description,
}: {
  title: string;
  links: RailLink[];
  description?: string;
}) {
  if (links.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="font-display mb-1.5 text-[20px] font-bold tracking-[-0.02em] text-dark">
        {title}
      </h2>
      {description && (
        <p className="mb-5 text-[14.5px] text-text2">{description}</p>
      )}
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-[14px] font-semibold text-text2 transition-colors hover:border-purple2 hover:text-purple2"
            >
              {link.label}
              {link.count != null && (
                <span className="text-[13px] font-normal text-text3">{link.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { InternalLinkRail };
