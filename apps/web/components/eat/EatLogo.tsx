import Link from "next/link";

/**
 * The eat brand mark: eat.klick
 *
 * Shaped like a domain because that is how people reach it —
 * eat.klickenya.com. "eat" carries the colour since it is the part that says
 * what this is; "klick" is the quieter half that ties it back to the parent
 * brand.
 *
 * Lives here rather than inline because it appears on every eat surface
 * (/eat, /eat/[city], and the flow at the root of eat.klickenya.com). It was
 * duplicated in two files before this, which is how the two copies would have
 * drifted apart.
 */
export function EatLogo({
  href,
  className = "",
}: {
  /** Where the mark points. The flow uses "/" (its own root on the
   *  subdomain); marketplace pages use "/eat". */
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="eat.klick — home"
      className={`font-display font-extrabold tracking-[-0.025em] ${className}`}
    >
      <span className="text-amber">eat</span>
      <span className="text-amber/60">.</span>
      <span className="text-white/90">klick</span>
    </Link>
  );
}
