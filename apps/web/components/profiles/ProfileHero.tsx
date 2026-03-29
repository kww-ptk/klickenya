import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string | number;
}

interface ProfileHeroProps {
  name: string;
  photo?: { asset?: { url?: string } } | null;
  bio?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  badgeLabel?: string;
  badgeColor?: "green" | "amber" | "blue" | "purple";
  verified?: boolean;
  memberSince?: string;
  stats?: StatItem[];
  backHref?: string;
  backLabel?: string;
}

const BADGE_STYLES: Record<string, string> = {
  green: "bg-[#16A34A]/15 text-[#16A34A]",
  amber: "bg-[#E8A020]/15 text-[#E8A020]",
  blue: "bg-[#2563EB]/15 text-[#2563EB]",
  purple: "bg-[#6B2D8B]/15 text-[#6B2D8B]",
};

function socialUrl(handle: string, base: string): string {
  if (handle.startsWith("http")) return handle;
  return `${base}/${handle.replace("@", "")}`;
}

export function ProfileHero({
  name,
  photo,
  bio,
  website,
  instagram,
  facebook,
  twitter,
  badgeLabel,
  badgeColor = "amber",
  verified,
  memberSince,
  stats,
  backHref = "/",
  backLabel = "Back to Klickenya",
}: ProfileHeroProps) {
  const photoUrl = photo?.asset?.url;
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasSocials = website || instagram || facebook || twitter;

  return (
    <div className="relative bg-[#16130C] overflow-hidden">
      {/* Background pattern */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://cdn.sanity.io/images/b9zd8u9f/production/59715b77a1b75a3d1f7bfd75ee2fbec9d5273f62-1600x900.svg?w=1800"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute inset-0 bg-[#16130C]/40 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-5 pt-8 pb-10 text-center">
        {/* Back link */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/70 transition-colors mb-6"
        >
          ← {backLabel}
        </Link>

        {/* Photo */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          {photoUrl ? (
            <Image
              src={`${photoUrl}?w=192&h=192&fit=crop&auto=format`}
              alt={name}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover border-4 border-white/10"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E8A020] to-[#6B2D8B] flex items-center justify-center text-white text-[28px] font-bold border-4 border-white/10">
              {initials}
            </div>
          )}
          {verified && (
            <span className="absolute -bottom-1 -right-1 size-7 rounded-full bg-[#16A34A] border-3 border-[#16130C] flex items-center justify-center">
              <Check className="size-4 text-white" strokeWidth={3} />
            </span>
          )}
        </div>

        {/* Name + badges */}
        <h1 className="font-display text-[26px] font-bold tracking-[-0.03em] text-white mb-1">
          {name}
        </h1>
        <div className="flex items-center justify-center gap-2 mb-4">
          {verified && (
            <span className="text-[12px] font-bold text-[#16A34A]">Verified</span>
          )}
          {badgeLabel && (
            <span
              className={cn(
                "text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                BADGE_STYLES[badgeColor]
              )}
            >
              {badgeLabel}
            </span>
          )}
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-[14px] text-white/50 max-w-md mx-auto mb-5 leading-relaxed">
            {bio}
          </p>
        )}

        {/* Social links */}
        {hasSocials && (
          <div className="flex items-center justify-center gap-4 mb-4">
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#E8A020] hover:text-[#F5C842] transition-colors"
              >
                Website
              </a>
            )}
            {instagram && (
              <a
                href={socialUrl(instagram, "https://instagram.com")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#E8A020] hover:text-[#F5C842] transition-colors"
              >
                Instagram
              </a>
            )}
            {facebook && (
              <a
                href={socialUrl(facebook, "https://facebook.com")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#E8A020] hover:text-[#F5C842] transition-colors"
              >
                Facebook
              </a>
            )}
            {twitter && (
              <a
                href={socialUrl(twitter, "https://x.com")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#E8A020] hover:text-[#F5C842] transition-colors"
              >
                Twitter
              </a>
            )}
          </div>
        )}

        {/* Member since */}
        {memberSince && (
          <p className="text-[12px] text-white/25 mb-4">
            Member since {memberSince}
          </p>
        )}

        {/* Stats strip */}
        {stats && stats.length > 0 && (
          <div className="flex items-center justify-center gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-[20px] font-bold text-white leading-none">
                  {stat.value}
                </p>
                <p className="text-[11px] text-white/30 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
