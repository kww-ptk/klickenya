import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { agentPath } from "@/lib/real-estate/constants";

interface AgentCardProps {
  name: string;
  slug: string;
  agency?: string;
  isVerified?: boolean;
  photoUrl?: string;
  specialisations?: string[];
  /** Live listings this agent has on the site. */
  propertyCount?: number;
}

/*
 * The rating, review count and sales figures this card used to render had no
 * source: there is no reviews system yet and nothing ever passed those props,
 * so the stats row rendered as an empty bordered strip on every card. Showing
 * the live listing count is the one number we can stand behind today. Add the
 * rest back when reviews ship.
 */

function AgentCard({
  name,
  slug,
  agency,
  isVerified,
  photoUrl,
  specialisations,
  propertyCount,
}: AgentCardProps) {
  return (
    <Link
      href={agentPath(slug)}
      className="block border border-border rounded-[22px] p-6 pt-6 text-center hover:shadow-md hover:-translate-y-[3px] transition-all duration-250 cursor-pointer"
    >
      {/* Avatar */}
      <div className="relative inline-block mb-3">
        <div className="size-[72px] rounded-full overflow-hidden border-[3px] border-white shadow-[0_0_0_2px_var(--color-border)] bg-surface2">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={name}
              width={72}
              height={72}
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full flex items-center justify-center text-[24px] font-bold text-text3">
              {name.charAt(0)}
            </div>
          )}
        </div>

        {/* Verified badge */}
        {isVerified && (
          <span
            title="Verified agent"
            className="absolute bottom-0.5 right-0.5 size-[22px] rounded-full bg-purple2 border-2 border-white flex items-center justify-center"
          >
            <Check className="size-[11px] text-white" strokeWidth={3} />
            <span className="sr-only">Verified agent</span>
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-[15px] font-bold text-text mb-0.5">{name}</p>

      {/* Agency */}
      {agency && (
        <p className="text-[12.5px] text-text3 mb-2.5">{agency}</p>
      )}

      {/* Specialisation tags */}
      {specialisations && specialisations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
          {specialisations.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-0.5 rounded-full bg-purple-dim border border-purple2/18 text-[11px] font-semibold text-purple2"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {propertyCount != null && (
        <div className="border-t border-border pt-3.5">
          <div className="text-[16px] font-bold text-text">{propertyCount}</div>
          <div className="mt-0.5 text-[11px] text-text3">
            {propertyCount === 1 ? "live listing" : "live listings"}
          </div>
        </div>
      )}
    </Link>
  );
}

export { AgentCard };
export type { AgentCardProps };
